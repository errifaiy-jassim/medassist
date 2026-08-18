import logging

from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    coding,
    consultations,
    dashboard,
    health,
    patients,
    pdf,
    settings,
    stt,
    transmission,
)

logger = logging.getLogger(__name__)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(patients.router, prefix="/patients", tags=["Patients"])
api_router.include_router(consultations.router, prefix="/consultations", tags=["Consultations"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(stt.router, prefix="/stt", tags=["Speech-To-Text"])
api_router.include_router(coding.router, prefix="/coding", tags=["Coding"])
api_router.include_router(transmission.router, prefix="/transmission", tags=["Transmission"])
api_router.include_router(pdf.router, prefix="/pdf", tags=["PDF"])
