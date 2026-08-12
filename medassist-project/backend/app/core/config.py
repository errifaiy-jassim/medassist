from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "MedAssist - Assistant IA de Consultation"
    DATABASE_URL: str = "sqlite:///./medassist.db"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()