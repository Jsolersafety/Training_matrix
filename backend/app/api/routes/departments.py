from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models import Department
from app.schemas import DepartmentCreate, DepartmentOut

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("/", response_model=list[DepartmentOut])
async def list_departments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).order_by(Department.name))
    return result.scalars().all()


@router.post("/", response_model=DepartmentOut, status_code=201)
async def create_department(data: DepartmentCreate, db: AsyncSession = Depends(get_db)):
    dept = Department(**data.model_dump())
    db.add(dept)
    await db.flush()
    await db.refresh(dept)
    return dept


@router.put("/{dept_id}", response_model=DepartmentOut)
async def update_department(dept_id: int, data: DepartmentCreate, db: AsyncSession = Depends(get_db)):
    dept = await db.get(Department, dept_id)
    if not dept:
        raise HTTPException(404, "Department not found")
    for k, v in data.model_dump().items():
        setattr(dept, k, v)
    await db.flush()
    await db.refresh(dept)
    return dept


@router.delete("/{dept_id}", status_code=204)
async def delete_department(dept_id: int, db: AsyncSession = Depends(get_db)):
    dept = await db.get(Department, dept_id)
    if not dept:
        raise HTTPException(404, "Department not found")
    await db.delete(dept)
