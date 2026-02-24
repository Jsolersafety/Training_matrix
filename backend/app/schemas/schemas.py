from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Optional
from decimal import Decimal


# ── Department ───────────────────────────────────────────────
class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentOut(DepartmentBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ── Role ─────────────────────────────────────────────────────
class RoleBase(BaseModel):
    name: str
    department_id: Optional[int] = None
    role_type: Optional[str] = "primary"  # primary or secondary
    description: Optional[str] = None

class RoleCreate(RoleBase):
    pass

class RoleOut(RoleBase):
    id: int
    role_type: Optional[str] = "primary"
    department: Optional[DepartmentOut] = None
    class Config:
        from_attributes = True


# ── Competency Category ─────────────────────────────────────
class CompetencyCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CompetencyCategoryCreate(CompetencyCategoryBase):
    pass

class CompetencyCategoryOut(CompetencyCategoryBase):
    id: int
    class Config:
        from_attributes = True


# ── Competency ───────────────────────────────────────────────
class CompetencyBase(BaseModel):
    name: str
    category_id: Optional[int] = None
    description: Optional[str] = None
    how_achieved: Optional[str] = None
    validation_types: Optional[list[str]] = []
    voc_document_name: Optional[str] = None
    internal_document_name: Optional[str] = None

class CompetencyCreate(CompetencyBase):
    pass

class CompetencyUpdate(CompetencyBase):
    pass

class CompetencyOut(CompetencyBase):
    id: int
    category: Optional[CompetencyCategoryOut] = None
    class Config:
        from_attributes = True


# ── Role Competency Requirement ──────────────────────────────
class RoleCompetencyBase(BaseModel):
    role_id: int
    competency_id: int
    requirement_type: str  # M(A), M(S), D(A), D(S), LM
    notes: Optional[str] = None

class RoleCompetencyCreate(RoleCompetencyBase):
    pass

class RoleCompetencyOut(RoleCompetencyBase):
    id: int
    class Config:
        from_attributes = True

class MatrixCellUpdate(BaseModel):
    role_id: int
    competency_id: int
    requirement_type: Optional[str] = None  # None = remove

class BulkMatrixUpdate(BaseModel):
    updates: list[MatrixCellUpdate]


# ── Training Course ──────────────────────────────────────────
class TrainingCourseBase(BaseModel):
    name: str
    provider_type: str
    provider_name: str
    recertification_months: Optional[int] = None
    internal_verification_allowed: bool = False
    internal_verifier_role: Optional[str] = None
    cost: Optional[Decimal] = Decimal("0")
    duration: Optional[str] = None
    website_url: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    linked_competency_ids: Optional[list[int]] = []

class TrainingCourseCreate(TrainingCourseBase):
    pass

class TrainingCourseUpdate(TrainingCourseBase):
    pass

class TrainingCourseOut(TrainingCourseBase):
    id: int
    active: bool = True
    linked_competency_ids: list[int] = []
    class Config:
        from_attributes = True


# ── Person ───────────────────────────────────────────────────
class PersonBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role_id: Optional[int] = None
    department_id: Optional[int] = None
    employee_number: Optional[str] = None
    usi: Optional[str] = None
    dob: Optional[date] = None
    secondary_roles: Optional[list[str]] = []
    start_date: Optional[date] = None

class PersonCreate(PersonBase):
    pass

class PersonUpdate(PersonBase):
    pass

class PersonOut(PersonBase):
    id: int
    active: bool = True
    role: Optional[RoleOut] = None
    department: Optional[DepartmentOut] = None
    class Config:
        from_attributes = True


# ── Training Record ──────────────────────────────────────────
class TrainingRecordBase(BaseModel):
    person_id: int
    competency_id: int
    course_id: Optional[int] = None
    completed_date: date
    expiry_date: Optional[date] = None
    certificate_number: Optional[str] = None
    provider_name: Optional[str] = None
    cost: Optional[Decimal] = None
    cm10_link: Optional[str] = None
    notes: Optional[str] = None

class TrainingRecordCreate(TrainingRecordBase):
    pass

class TrainingRecordUpdate(TrainingRecordBase):
    pass

class TrainingRecordOut(TrainingRecordBase):
    id: int
    file_path: Optional[str] = None
    cm10_link: Optional[str] = None
    course: Optional[TrainingCourseOut] = None
    class Config:
        from_attributes = True


# ── CSV Upload ───────────────────────────────────────────────
class CSVUploadResult(BaseModel):
    imported: int
    skipped: int
    errors: list[str]


# ── Reports ──────────────────────────────────────────────────
class ComplianceSummary(BaseModel):
    person_id: int
    person_name: str
    role_name: str
    department_name: str
    required_count: int
    completed_count: int
    expired_count: int
    expiring_count: int
    compliance_percentage: float

class DepartmentSummary(BaseModel):
    department_name: str
    total_people: int
    total_required: int
    total_completed: int
    total_expired: int
    compliance_percentage: float

class ExpiringTraining(BaseModel):
    person_name: str
    competency_name: str
    expiry_date: date
    days_until_expiry: int


# ── Matrix View ──────────────────────────────────────────────
class MatrixData(BaseModel):
    roles: list[RoleOut]
    competencies: list[CompetencyOut]
    requirements: dict[str, dict[str, str]]  # {comp_id: {role_id: requirement_type}}
