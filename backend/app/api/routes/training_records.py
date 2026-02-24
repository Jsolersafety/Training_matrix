import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.config import get_settings
from app.models import TrainingRecord
from app.schemas import TrainingRecordCreate, TrainingRecordUpdate, TrainingRecordOut

router = APIRouter(prefix="/training-records", tags=["training-records"])
settings = get_settings()


@router.get("/", response_model=list[TrainingRecordOut])
async def list_records(
    person_id: int | None = None,
    competency_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(TrainingRecord).options(selectinload(TrainingRecord.course))
    if person_id:
        q = q.where(TrainingRecord.person_id == person_id)
    if competency_id:
        q = q.where(TrainingRecord.competency_id == competency_id)
    q = q.order_by(TrainingRecord.completed_date.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{record_id}", response_model=TrainingRecordOut)
async def get_record(record_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TrainingRecord)
        .options(selectinload(TrainingRecord.course))
        .where(TrainingRecord.id == record_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Record not found")
    return record


@router.post("/", response_model=TrainingRecordOut, status_code=201)
async def create_record(data: TrainingRecordCreate, db: AsyncSession = Depends(get_db)):
    record_data = data.model_dump()
    # Convert empty strings to None
    for field in ['certificate_number', 'provider_name', 'notes']:
        if record_data.get(field) == '':
            record_data[field] = None
    record = TrainingRecord(**record_data)
    db.add(record)
    await db.flush()
    await db.refresh(record, ["course"])
    return record


@router.put("/{record_id}", response_model=TrainingRecordOut)
async def update_record(record_id: int, data: TrainingRecordUpdate, db: AsyncSession = Depends(get_db)):
    record = await db.get(TrainingRecord, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(record, k, v)
    await db.flush()
    await db.refresh(record)
    return record


@router.delete("/{record_id}", status_code=204)
async def delete_record(record_id: int, db: AsyncSession = Depends(get_db)):
    record = await db.get(TrainingRecord, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    # Delete associated file if exists
    if record.file_path and os.path.exists(record.file_path):
        os.remove(record.file_path)
    await db.delete(record)


@router.post("/{record_id}/upload")
async def upload_certificate(
    record_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a certificate file for a training record."""
    record = await db.get(TrainingRecord, record_id)
    if not record:
        raise HTTPException(404, "Record not found")

    # Validate file type
    allowed_types = {
        "application/pdf", "image/jpeg", "image/png", "image/gif",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }
    if file.content_type not in allowed_types:
        raise HTTPException(400, f"File type {file.content_type} not allowed")

    # Max 10MB
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10MB)")

    # Save file
    ext = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    with open(filepath, "wb") as f:
        f.write(content)

    # Delete old file if exists
    if record.file_path and os.path.exists(record.file_path):
        os.remove(record.file_path)

    record.file_path = filepath
    await db.flush()

    return {"filename": filename, "path": filepath}
