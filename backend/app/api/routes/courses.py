from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models import TrainingCourse, CourseCompetency
from app.schemas import TrainingCourseCreate, TrainingCourseUpdate, TrainingCourseOut

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("/", response_model=list[TrainingCourseOut])
async def list_courses(active_only: bool = True, db: AsyncSession = Depends(get_db)):
    q = select(TrainingCourse).options(selectinload(TrainingCourse.competency_links))
    if active_only:
        q = q.where(TrainingCourse.active == True)
    q = q.order_by(TrainingCourse.name)
    result = await db.execute(q)
    courses = result.scalars().all()

    out = []
    for c in courses:
        course_dict = TrainingCourseOut.model_validate(c).model_dump()
        course_dict["linked_competency_ids"] = [cl.competency_id for cl in c.competency_links]
        out.append(TrainingCourseOut(**course_dict))
    return out


@router.get("/{course_id}", response_model=TrainingCourseOut)
async def get_course(course_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TrainingCourse)
        .options(selectinload(TrainingCourse.competency_links))
        .where(TrainingCourse.id == course_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(404, "Course not found")

    course_dict = TrainingCourseOut.model_validate(course).model_dump()
    course_dict["linked_competency_ids"] = [cl.competency_id for cl in course.competency_links]
    return TrainingCourseOut(**course_dict)


@router.post("/", response_model=TrainingCourseOut, status_code=201)
async def create_course(data: TrainingCourseCreate, db: AsyncSession = Depends(get_db)):
    comp_ids = data.linked_competency_ids or []
    course_data = data.model_dump(exclude={"linked_competency_ids"})
    course = TrainingCourse(**course_data)
    db.add(course)
    await db.flush()

    for cid in comp_ids:
        db.add(CourseCompetency(course_id=course.id, competency_id=cid))
    await db.flush()
    await db.refresh(course)

    course_dict = TrainingCourseOut.model_validate(course).model_dump()
    course_dict["linked_competency_ids"] = comp_ids
    return TrainingCourseOut(**course_dict)


@router.put("/{course_id}", response_model=TrainingCourseOut)
async def update_course(course_id: int, data: TrainingCourseUpdate, db: AsyncSession = Depends(get_db)):
    course = await db.get(TrainingCourse, course_id)
    if not course:
        raise HTTPException(404, "Course not found")

    comp_ids = data.linked_competency_ids or []
    course_data = data.model_dump(exclude={"linked_competency_ids"}, exclude_unset=True)
    for k, v in course_data.items():
        setattr(course, k, v)

    # Update competency links
    await db.execute(delete(CourseCompetency).where(CourseCompetency.course_id == course_id))
    for cid in comp_ids:
        db.add(CourseCompetency(course_id=course_id, competency_id=cid))

    await db.flush()
    await db.refresh(course)

    course_dict = TrainingCourseOut.model_validate(course).model_dump()
    course_dict["linked_competency_ids"] = comp_ids
    return TrainingCourseOut(**course_dict)


@router.delete("/{course_id}", status_code=204)
async def delete_course(course_id: int, db: AsyncSession = Depends(get_db)):
    course = await db.get(TrainingCourse, course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    await db.delete(course)
