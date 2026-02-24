from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models import Role
from app.schemas import RoleCreate, RoleOut

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("/", response_model=list[RoleOut])
async def list_roles(department_id: int | None = None, db: AsyncSession = Depends(get_db)):
    q = select(Role).options(selectinload(Role.department)).order_by(Role.name)
    if department_id:
        q = q.where(Role.department_id == department_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=RoleOut, status_code=201)
async def create_role(data: RoleCreate, db: AsyncSession = Depends(get_db)):
    role = Role(**data.model_dump())
    db.add(role)
    await db.flush()
    await db.refresh(role)
    return role


@router.put("/{role_id}", response_model=RoleOut)
async def update_role(role_id: int, data: RoleCreate, db: AsyncSession = Depends(get_db)):
    role = await db.get(Role, role_id)
    if not role:
        raise HTTPException(404, "Role not found")
    for k, v in data.model_dump().items():
        setattr(role, k, v)
    await db.flush()
    await db.refresh(role)
    return role


@router.delete("/{role_id}", status_code=204)
async def delete_role(role_id: int, db: AsyncSession = Depends(get_db)):
    role = await db.get(Role, role_id)
    if not role:
        raise HTTPException(404, "Role not found")
    await db.delete(role)
