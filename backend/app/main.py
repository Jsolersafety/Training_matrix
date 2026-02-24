from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import get_settings
from app.core.database import engine, Base
from app.api.routes import departments, roles, competencies, matrix, courses, people, training_records, reports, auth

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Seed default admin
    from app.core.auth import seed_default_admin
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        await seed_default_admin(session)
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="Training Management System API for Cook Shire Council",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes under /api prefix
app.include_router(departments.router, prefix="/api")
app.include_router(roles.router, prefix="/api")
app.include_router(competencies.router, prefix="/api")
app.include_router(matrix.router, prefix="/api")
app.include_router(courses.router, prefix="/api")
app.include_router(people.router, prefix="/api")
app.include_router(training_records.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(auth.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": settings.APP_NAME}
