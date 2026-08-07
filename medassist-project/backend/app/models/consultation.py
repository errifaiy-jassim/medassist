from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from app.core.database import Base
import uuid
from datetime import datetime

class Consultation(Base):
    __tablename__ = "consultations"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"))
    transcription = Column(Text)
    structured_data = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)