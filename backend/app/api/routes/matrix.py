from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models import Role, Competency, RoleCompetency
from app.schemas import (
    RoleCompetencyCreate, RoleCompetencyOut,
    MatrixCellUpdate, BulkMatrixUpdate, MatrixData, RoleOut, CompetencyOut
)

router = APIRouter(prefix="/matrix", tags=["matrix"])


@router.get("/", response_model=MatrixData)
async def get_full_matrix(db: AsyncSession = Depends(get_db)):
    """Get the full competency matrix with all roles, competencies, and requirements."""
    # Fetch roles
    roles_result = await db.execute(
        select(Role).options(selectinload(Role.department)).order_by(Role.id)
    )
    roles = roles_result.scalars().all()

    # Fetch competencies
    comps_result = await db.execute(
        select(Competency).options(selectinload(Competency.category)).order_by(Competency.id)
    )
    competencies = comps_result.scalars().all()

    # Fetch all requirements
    reqs_result = await db.execute(select(RoleCompetency))
    reqs = reqs_result.scalars().all()

    # Build requirements dict: {comp_id: {role_id: requirement_type}}
    requirements: dict[str, dict[str, str]] = {}
    for req in reqs:
        comp_key = str(req.competency_id)
        role_key = str(req.role_id)
        if comp_key not in requirements:
            requirements[comp_key] = {}
        requirements[comp_key][role_key] = req.requirement_type

    return MatrixData(
        roles=[RoleOut.model_validate(r) for r in roles],
        competencies=[CompetencyOut.model_validate(c) for c in competencies],
        requirements=requirements,
    )


@router.put("/cell")
async def update_matrix_cell(data: MatrixCellUpdate, db: AsyncSession = Depends(get_db)):
    """Update a single cell in the matrix."""
    # Find existing
    result = await db.execute(
        select(RoleCompetency).where(
            RoleCompetency.role_id == data.role_id,
            RoleCompetency.competency_id == data.competency_id
        )
    )
    existing = result.scalar_one_or_none()

    if data.requirement_type is None or data.requirement_type == "":
        # Remove requirement
        if existing:
            await db.delete(existing)
        return {"status": "removed"}
    else:
        if existing:
            existing.requirement_type = data.requirement_type
        else:
            rc = RoleCompetency(
                role_id=data.role_id,
                competency_id=data.competency_id,
                requirement_type=data.requirement_type,
            )
            db.add(rc)
        return {"status": "updated"}


@router.put("/bulk")
async def bulk_update_matrix(data: BulkMatrixUpdate, db: AsyncSession = Depends(get_db)):
    """Bulk update matrix cells."""
    updated = 0
    removed = 0
    for cell in data.updates:
        result = await db.execute(
            select(RoleCompetency).where(
                RoleCompetency.role_id == cell.role_id,
                RoleCompetency.competency_id == cell.competency_id
            )
        )
        existing = result.scalar_one_or_none()

        if cell.requirement_type is None or cell.requirement_type == "":
            if existing:
                await db.delete(existing)
                removed += 1
        else:
            if existing:
                existing.requirement_type = cell.requirement_type
            else:
                db.add(RoleCompetency(
                    role_id=cell.role_id,
                    competency_id=cell.competency_id,
                    requirement_type=cell.requirement_type,
                ))
            updated += 1

    return {"updated": updated, "removed": removed}


@router.get("/role/{role_id}")
async def get_role_requirements(role_id: int, db: AsyncSession = Depends(get_db)):
    """Get all competency requirements for a specific role."""
    result = await db.execute(
        select(RoleCompetency)
        .options(selectinload(RoleCompetency.competency))
        .where(RoleCompetency.role_id == role_id)
    )
    return result.scalars().all()


@router.get("/competency/{comp_id}")
async def get_competency_roles(comp_id: int, db: AsyncSession = Depends(get_db)):
    """Get all roles that require a specific competency."""
    result = await db.execute(
        select(RoleCompetency)
        .options(selectinload(RoleCompetency.role))
        .where(RoleCompetency.competency_id == comp_id)
    )
    return result.scalars().all()
