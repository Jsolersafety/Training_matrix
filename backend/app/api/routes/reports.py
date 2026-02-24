from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from app.core.database import get_db
from app.models import (
    Person, Role, Department, RoleCompetency, TrainingRecord, Competency, TrainingCourse
)
from app.schemas import ComplianceSummary, DepartmentSummary, ExpiringTraining

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/compliance/detail/{person_id}")
async def compliance_detail(person_id: int, db: AsyncSession = Depends(get_db)):
    """Get detailed competency breakdown for a person — which are done, expired, missing."""
    today = date.today()
    thirty_days = today + timedelta(days=30)

    person = await db.get(Person, person_id)
    if not person or not person.role_id:
        return []

    # Get required competencies for this role
    req_result = await db.execute(
        select(RoleCompetency, Competency)
        .join(Competency, RoleCompetency.competency_id == Competency.id)
        .where(RoleCompetency.role_id == person.role_id)
        .order_by(Competency.name)
    )
    requirements = req_result.all()

    # Get training records
    records_result = await db.execute(
        select(TrainingRecord).where(TrainingRecord.person_id == person_id)
    )
    records = records_result.scalars().all()
    records_map = {r.competency_id: r for r in records}

    details = []
    for req, comp in requirements:
        record = records_map.get(comp.id)
        if record:
            if record.expiry_date and record.expiry_date < today:
                status = "expired"
            elif record.expiry_date and record.expiry_date <= thirty_days:
                status = "expiring"
            else:
                status = "complete"
        else:
            status = "missing"

        details.append({
            "competency_id": comp.id,
            "competency_name": comp.name,
            "requirement_type": req.requirement_type,
            "status": status,
            "completed_date": record.completed_date.isoformat() if record else None,
            "expiry_date": record.expiry_date.isoformat() if record and record.expiry_date else None,
            "certificate_number": record.certificate_number if record else None,
            "course_name": None,
            "cm10_link": getattr(record, 'cm10_link', None) if record else None,
            "provider_name": record.provider_name if record else None,
        })

    # Fill in course names
    for d in details:
        rec = records_map.get(d["competency_id"])
        if rec and rec.course_id:
            course = await db.get(TrainingCourse, rec.course_id)
            d["course_name"] = course.name if course else None

    return details


@router.get("/compliance", response_model=list[ComplianceSummary])
async def compliance_report(
    department_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Get compliance summary for all active staff."""
    today = date.today()
    thirty_days = today + timedelta(days=30)

    # Get all active people with their role requirements
    people_q = (
        select(Person)
        .where(Person.active == True)
        .order_by(Person.last_name)
    )
    if department_id:
        people_q = people_q.where(Person.department_id == department_id)

    people_result = await db.execute(people_q)
    people = people_result.scalars().all()

    summaries = []
    for person in people:
        if not person.role_id:
            continue

        # Get required competencies for this role
        req_result = await db.execute(
            select(RoleCompetency).where(RoleCompetency.role_id == person.role_id)
        )
        required = req_result.scalars().all()
        required_comp_ids = {r.competency_id for r in required}

        # Get training records for this person
        records_result = await db.execute(
            select(TrainingRecord).where(TrainingRecord.person_id == person.id)
        )
        records = records_result.scalars().all()
        records_map = {r.competency_id: r for r in records}

        completed = 0
        expired = 0
        expiring = 0

        for comp_id in required_comp_ids:
            record = records_map.get(comp_id)
            if record:
                if record.expiry_date:
                    if record.expiry_date < today:
                        expired += 1
                    elif record.expiry_date <= thirty_days:
                        expiring += 1
                        completed += 1
                    else:
                        completed += 1
                else:
                    completed += 1

        # Get role and department names
        role = await db.get(Role, person.role_id) if person.role_id else None
        dept = await db.get(Department, person.department_id) if person.department_id else None

        total_required = len(required_comp_ids)
        summaries.append(ComplianceSummary(
            person_id=person.id,
            person_name=f"{person.first_name} {person.last_name}",
            role_name=role.name if role else "Unassigned",
            department_name=dept.name if dept else "Unassigned",
            required_count=total_required,
            completed_count=completed,
            expired_count=expired,
            expiring_count=expiring,
            compliance_percentage=round(completed / total_required * 100, 1) if total_required > 0 else 0,
        ))

    return summaries


@router.get("/departments", response_model=list[DepartmentSummary])
async def department_summary(db: AsyncSession = Depends(get_db)):
    """Get training summary by department."""
    today = date.today()

    depts_result = await db.execute(select(Department).order_by(Department.name))
    departments = depts_result.scalars().all()

    summaries = []
    for dept in departments:
        # People in this department
        people_result = await db.execute(
            select(Person).where(
                Person.department_id == dept.id,
                Person.active == True,
            )
        )
        people = people_result.scalars().all()

        total_required = 0
        total_completed = 0
        total_expired = 0

        for person in people:
            if not person.role_id:
                continue

            req_result = await db.execute(
                select(func.count(RoleCompetency.id)).where(
                    RoleCompetency.role_id == person.role_id
                )
            )
            req_count = req_result.scalar() or 0
            total_required += req_count

            # Completed (current) records
            comp_result = await db.execute(
                select(func.count(TrainingRecord.id)).where(
                    TrainingRecord.person_id == person.id,
                    (TrainingRecord.expiry_date == None) | (TrainingRecord.expiry_date >= today),
                )
            )
            total_completed += comp_result.scalar() or 0

            # Expired records
            exp_result = await db.execute(
                select(func.count(TrainingRecord.id)).where(
                    TrainingRecord.person_id == person.id,
                    TrainingRecord.expiry_date < today,
                )
            )
            total_expired += exp_result.scalar() or 0

        summaries.append(DepartmentSummary(
            department_name=dept.name,
            total_people=len(people),
            total_required=total_required,
            total_completed=total_completed,
            total_expired=total_expired,
            compliance_percentage=round(total_completed / total_required * 100, 1) if total_required > 0 else 0,
        ))

    return summaries


@router.get("/expiring", response_model=list[ExpiringTraining])
async def expiring_training(days: int = 30, db: AsyncSession = Depends(get_db)):
    """Get training records expiring within the given number of days."""
    today = date.today()
    cutoff = today + timedelta(days=days)

    result = await db.execute(
        select(TrainingRecord, Person, Competency)
        .join(Person, TrainingRecord.person_id == Person.id)
        .join(Competency, TrainingRecord.competency_id == Competency.id)
        .where(
            TrainingRecord.expiry_date != None,
            TrainingRecord.expiry_date >= today,
            TrainingRecord.expiry_date <= cutoff,
            Person.active == True,
        )
        .order_by(TrainingRecord.expiry_date)
    )

    rows = result.all()
    return [
        ExpiringTraining(
            person_name=f"{person.first_name} {person.last_name}",
            competency_name=comp.name,
            expiry_date=record.expiry_date,
            days_until_expiry=(record.expiry_date - today).days,
        )
        for record, person, comp in rows
    ]


@router.get("/stats")
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Get overall dashboard statistics."""
    today = date.today()
    thirty_days = today + timedelta(days=30)

    total_people = (await db.execute(
        select(func.count(Person.id)).where(Person.active == True)
    )).scalar() or 0

    total_roles = (await db.execute(select(func.count(Role.id)))).scalar() or 0
    total_competencies = (await db.execute(select(func.count(Competency.id)))).scalar() or 0
    total_records = (await db.execute(select(func.count(TrainingRecord.id)))).scalar() or 0

    expired_count = (await db.execute(
        select(func.count(TrainingRecord.id))
        .join(Person)
        .where(
            TrainingRecord.expiry_date < today,
            Person.active == True,
        )
    )).scalar() or 0

    expiring_count = (await db.execute(
        select(func.count(TrainingRecord.id))
        .join(Person)
        .where(
            TrainingRecord.expiry_date >= today,
            TrainingRecord.expiry_date <= thirty_days,
            Person.active == True,
        )
    )).scalar() or 0

    return {
        "total_people": total_people,
        "total_roles": total_roles,
        "total_competencies": total_competencies,
        "total_records": total_records,
        "expired_count": expired_count,
        "expiring_count": expiring_count,
    }
