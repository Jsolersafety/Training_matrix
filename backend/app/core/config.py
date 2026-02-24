from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://training_app:changeme@db:5432/training_matrix"
    DATABASE_URL_SYNC: str = "postgresql://training_app:changeme@db:5432/training_matrix"

    # Security
    SECRET_KEY: str = "change-this-secret-key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours
    ALGORITHM: str = "HS256"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # App
    ENVIRONMENT: str = "development"
    APP_NAME: str = "Training Management System"
    UPLOAD_DIR: str = "/app/uploads"

    class Config:
        env_file = ".env"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
