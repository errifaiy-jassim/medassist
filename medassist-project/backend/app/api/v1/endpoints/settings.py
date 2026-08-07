from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_settings():
    return {"status": "ok"}