from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models import Competency, CompetencyCategory
from app.schemas import (
    CompetencyCreate, CompetencyUpdate, CompetencyOut,
    CompetencyCategoryCreate, CompetencyCategoryOut
)

router = APIRouter(prefix="/competencies", tags=["competencies"])


# ── Categories ───────────────────────────────────────────────
@router.get("/categories", response_model=list[CompetencyCategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CompetencyCategory).order_by(CompetencyCategory.name))
    return result.scalars().all()


@router.post("/categories", response_model=CompetencyCategoryOut, status_code=201)
async def create_category(data: CompetencyCategoryCreate, db: AsyncSession = Depends(get_db)):
    cat = CompetencyCategory(**data.model_dump())
    db.add(cat)
    await db.flush()
    await db.refresh(cat)
    return cat


# ── Competencies ─────────────────────────────────────────────
@router.get("/", response_model=list[CompetencyOut])
async def list_competencies(category_id: int | None = None, db: AsyncSession = Depends(get_db)):
    q = select(Competency).options(selectinload(Competency.category)).order_by(Competency.name)
    if category_id:
        q = q.where(Competency.category_id == category_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{comp_id}", response_model=CompetencyOut)
async def get_competency(comp_id: int, db: AsyncSession = Depends(get_db)):
    comp = await db.get(Competency, comp_id)
    if not comp:
        raise HTTPException(404, "Competency not found")
    return comp


@router.post("/", response_model=CompetencyOut, status_code=201)
async def create_competency(data: CompetencyCreate, db: AsyncSession = Depends(get_db)):
    comp = Competency(**data.model_dump())
    db.add(comp)
    await db.flush()
    await db.refresh(comp)
    return comp


@router.put("/{comp_id}", response_model=CompetencyOut)
async def update_competency(comp_id: int, data: CompetencyUpdate, db: AsyncSession = Depends(get_db)):
    comp = await db.get(Competency, comp_id)
    if not comp:
        raise HTTPException(404, "Competency not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(comp, k, v)
    await db.flush()
    await db.refresh(comp)
    return comp


@router.delete("/{comp_id}", status_code=204)
async def delete_competency(comp_id: int, db: AsyncSession = Depends(get_db)):
    comp = await db.get(Competency, comp_id)
    if not comp:
        raise HTTPException(404, "Competency not found")
    await db.delete(comp)
