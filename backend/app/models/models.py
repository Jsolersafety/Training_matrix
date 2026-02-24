from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime, Numeric,
    ForeignKey, Enum as SQLEnum, JSON, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class RequirementType(str, enum.Enum):
    MA = "M(A)"
    MS = "M(S)"
    DA = "D(A)"
    DS = "D(S)"
    LM = "LM"


class ProviderType(str, enum.Enum):
    INTERNAL = "internal"
    EXTERNAL = "external"


# ── Departments ──────────────────────────────────────────────
class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    roles = relationship("Role", back_populates="department")
    people = relationship("Person", back_populates="department")


# ── Roles ────────────────────────────────────────────────────
class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"))
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    department = relationship("Department", back_populates="roles")
    competency_requirements = relationship("RoleCompetency", back_populates="role")
    people = relationship("Person", back_populates="role")


# ── Competency Categories ────────────────────────────────────
class CompetencyCategory(Base):
    __tablename__ = "competency_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    competencies = relationship("Competency", back_populates="category")


# ── Competencies ─────────────────────────────────────────────
class Competency(Base):
    __tablename__ = "competencies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    category_id = Column(Integer, ForeignKey("competency_categories.id", ondelete="SET NULL"))
    description = Column(Text)
    how_achieved = Column(Text)
    validation_types = Column(JSON, default=list)  # ["Certificate", "Licence", "VOC", "Internal Assessment"]
    voc_document_name = Column(String(200))
    internal_document_name = Column(String(200))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    category = relationship("CompetencyCategory", back_populates="competencies")
    role_requirements = relationship("RoleCompetency", back_populates="competency")
    course_links = relationship("CourseCompetency", back_populates="competency")
    training_records = relationship("TrainingRecord", back_populates="competency")


# ── Role-Competency Requirements (the matrix) ───────────────
class RoleCompetency(Base):
    __tablename__ = "role_competencies"

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    competency_id = Column(Integer, ForeignKey("competencies.id", ondelete="CASCADE"), nullable=False)
    requirement_type = Column(String(10), nullable=False)  # M(A), M(S), D(A), D(S), LM
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("role_id", "competency_id", name="uq_role_competency"),
    )

    role = relationship("Role", back_populates="competency_requirements")
    competency = relationship("Competency", back_populates="role_requirements")


# ── Training Courses ─────────────────────────────────────────
class TrainingCourse(Base):
    __tablename__ = "training_courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    provider_type = Column(String(10), nullable=False)  # internal / external
    provider_name = Column(String(150), nullable=False)
    recertification_months = Column(Integer, nullable=True)
    internal_verification_allowed = Column(Boolean, default=False)
    internal_verifier_role = Column(String(100))
    cost = Column(Numeric(10, 2), default=0)
    duration = Column(String(50))
    website_url = Column(String(500))
    contact_phone = Column(String(50))
    contact_email = Column(String(100))
    description = Column(Text)
    notes = Column(Text)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    competency_links = relationship("CourseCompetency", back_populates="course")
    training_records = relationship("TrainingRecord", back_populates="course")


# ── Course-Competency Link ───────────────────────────────────
class CourseCompetency(Base):
    __tablename__ = "course_competencies"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("training_courses.id", ondelete="CASCADE"), nullable=False)
    competency_id = Column(Integer, ForeignKey("competencies.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("course_id", "competency_id", name="uq_course_competency"),
    )

    course = relationship("TrainingCourse", back_populates="competency_links")
    competency = relationship("Competency", back_populates="course_links")


# ── People / Staff ───────────────────────────────────────────
class Person(Base):
    __tablename__ = "people"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(100), unique=True)
    phone = Column(String(20))
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="SET NULL"))
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"))
    employee_number = Column(String(50), unique=True)
    usi = Column(String(20))  # Unique Student Identifier
    dob = Column(Date)
    secondary_roles = Column(JSON, default=list)  # ["First Aider", "Fire Warden"]
    start_date = Column(Date)
    end_date = Column(Date)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    role = relationship("Role", back_populates="people")
    department = relationship("Department", back_populates="people")
    training_records = relationship("TrainingRecord", back_populates="person")


# ── Training Records ─────────────────────────────────────────
class TrainingRecord(Base):
    __tablename__ = "training_records"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), nullable=False)
    competency_id = Column(Integer, ForeignKey("competencies.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(Integer, ForeignKey("training_courses.id", ondelete="SET NULL"))
    completed_date = Column(Date, nullable=False)
    expiry_date = Column(Date)
    certificate_number = Column(String(100))
    provider_name = Column(String(150))
    cost = Column(Numeric(10, 2))
    file_path = Column(String(500))  # uploaded certificate path
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_training_person_competency", "person_id", "competency_id"),
        Index("idx_training_expiry", "expiry_date"),
    )

    person = relationship("Person", back_populates="training_records")
    competency = relationship("Competency", back_populates="training_records")
    course = relationship("TrainingCourse", back_populates="training_records")


# ── Audit Log ────────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String(50), nullable=False)
    record_id = Column(Integer, nullable=False)
    action = Column(String(10), nullable=False)  # INSERT, UPDATE, DELETE
    old_values = Column(JSON)
    new_values = Column(JSON)
    changed_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
