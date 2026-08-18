from fastapi import APIRouter

from app.core.database import check_database_connection

router = APIRouter()


@router.get("/health")
def health_check():
    db_ok = check_database_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "service": "MedAssist API",
        "database": "connected" if db_ok else "unavailable",
    }
