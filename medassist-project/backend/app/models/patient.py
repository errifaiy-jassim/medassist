from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

class Patient(Base):
    __tablename__ = "patients"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name = Column(String, nullable=False)
    nir = Column(String, unique=True, index=True, nullable=True)
    age = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    dossier_number = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    consultations = relationship("Consultation", back_populates="patient", cascade="all, delete-orphan")