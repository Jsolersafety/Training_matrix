import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models import Person, Role, Department
from app.schemas import PersonCreate, PersonUpdate, PersonOut, CSVUploadResult

router = APIRouter(prefix="/people", tags=["people"])


@router.get("/", response_model=list[PersonOut])
async def list_people(
    department_id: int | None = None,
    role_id: int | None = None,
    active_only: bool = True,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(Person).options(
        selectinload(Person.role).selectinload(Role.department),
        selectinload(Person.department),
    )
    if active_only:
        q = q.where(Person.active == True)
    if department_id:
        q = q.where(Person.department_id == department_id)
    if role_id:
        q = q.where(Person.role_id == role_id)
    if search:
        q = q.where(
            (Person.first_name.ilike(f"%{search}%"))
            | (Person.last_name.ilike(f"%{search}%"))
            | (Person.email.ilike(f"%{search}%"))
        )
    q = q.order_by(Person.last_name, Person.first_name)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{person_id}", response_model=PersonOut)
async def get_person(person_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Person)
        .options(
            selectinload(Person.role).selectinload(Role.department),
            selectinload(Person.department),
        )
        .where(Person.id == person_id)
    )
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(404, "Person not found")
    return person


@router.post("/", response_model=PersonOut, status_code=201)
async def create_person(data: PersonCreate, db: AsyncSession = Depends(get_db)):
    person_data = data.model_dump()
    # Convert empty strings to None for unique fields
    for field in ['email', 'employee_number', 'usi', 'phone']:
        if person_data.get(field) == '':
            person_data[field] = None
    person = Person(**person_data)
    db.add(person)
    await db.flush()
    await db.refresh(person, ["role", "department"])
    return person


@router.put("/{person_id}", response_model=PersonOut)
async def update_person(person_id: int, data: PersonUpdate, db: AsyncSession = Depends(get_db)):
    person = await db.get(Person, person_id)
    if not person:
        raise HTTPException(404, "Person not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        # Convert empty strings to None for unique fields
        if k in ['email', 'employee_number', 'usi', 'phone'] and v == '':
            v = None
        setattr(person, k, v)
    await db.flush()
    await db.refresh(person, ["role", "department"])
    return person


@router.delete("/{person_id}", status_code=204)
async def delete_person(person_id: int, db: AsyncSession = Depends(get_db)):
    person = await db.get(Person, person_id)
    if not person:
        raise HTTPException(404, "Person not found")
    person.active = False  # Soft delete
    await db.flush()


@router.post("/csv-import", response_model=CSVUploadResult)
async def import_csv(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Import people from CSV file. Flexible column matching."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "File must be a CSV")

    content = await file.read()
    text = content.decode("utf-8-sig")
    
    # Auto-detect delimiter (tab vs comma)
    first_line = text.split('\n')[0] if text else ''
    delimiter = '\t' if '\t' in first_line else ','
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)

    imported = 0
    skipped = 0
    errors = []

    # Flexible column name mapping
    def find_col(row, options):
        """Try multiple column name variants"""
        for opt in options:
            for key in row.keys():
                if key and key.strip().lower().replace(' ', '_').replace('-', '_') == opt.lower():
                    return row[key].strip() if row[key] else ""
        return ""

    # Cache roles and departments
    roles_result = await db.execute(select(Role))
    roles_map = {r.name.lower(): r.id for r in roles_result.scalars().all()}

    depts_result = await db.execute(select(Department))
    depts_map = {d.name.lower(): d.id for d in depts_result.scalars().all()}

    for i, row in enumerate(reader, start=2):
        try:
            # Try multiple column name patterns
            first_name = find_col(row, ['first_name', 'firstname', 'first', 'given_name', 'givenname'])
            last_name = find_col(row, ['last_name', 'lastname', 'last', 'surname', 'family_name', 'familyname'])

            # If no separate first/last, try full name column
            if not first_name and not last_name:
                full_name = find_col(row, ['name', 'full_name', 'fullname', 'employee_name', 'staff_name', 'worker'])
                if full_name:
                    parts = full_name.split(None, 1)
                    first_name = parts[0] if parts else ""
                    last_name = parts[1] if len(parts) > 1 else ""

            if not first_name and not last_name:
                errors.append(f"Row {i}: Missing name — need 'first_name'+'last_name' or 'name' column")
                skipped += 1
                continue

            # Default last name if only first provided
            if first_name and not last_name:
                last_name = "Unknown"

            email = find_col(row, ['email', 'email_address', 'e_mail']) or None
            phone = find_col(row, ['phone', 'phone_number', 'mobile', 'contact', 'telephone']) or None
            emp_num = find_col(row, ['employee_number', 'emp_number', 'emp_no', 'employee_id', 'emp_id', 'staff_id', 'payroll_number', 'payroll_no']) or None

            # Check duplicate email
            if email:
                existing = await db.execute(select(Person).where(Person.email == email))
                if existing.scalar_one_or_none():
                    errors.append(f"Row {i}: Email {email} already exists")
                    skipped += 1
                    continue

            # Resolve role
            role_name = find_col(row, ['role_name', 'role', 'position', 'job_title', 'title', 'role_id']).lower()
            role_id = roles_map.get(role_name)

            # Resolve department
            dept_name = find_col(row, ['department_name', 'department', 'dept', 'section', 'team', 'division', 'department_id']).lower()
            department_id = depts_map.get(dept_name)

            person = Person(
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone=phone,
                role_id=role_id,
                department_id=department_id,
                employee_number=emp_num,
            )
            db.add(person)
            imported += 1

        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")
            skipped += 1

    await db.flush()
    return CSVUploadResult(imported=imported, skipped=skipped, errors=errors)
