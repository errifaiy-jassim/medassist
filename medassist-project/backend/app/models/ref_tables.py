from sqlalchemy import Column, String, Integer, Text
from app.database import Base  # Ajustez l'import selon votre structure

class CIM10(Base):
    __tablename__ = "ref_cim10"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)  # ex: J45.0
    libelle = Column(Text, nullable=False)                             # ex: Asthme à prédominance allergique

class NABM(Base):
    __tablename__ = "ref_nabm"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)  # Code acte (ex: 0501)
    libelle = Column(Text, nullable=False)                             # ex: Glycémie à jeun
    coefficient = Column(String(20), nullable=True)                    # B 10, B 15, etc.

class GMR(Base):
    __tablename__ = "ref_gmr"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
    libelle = Column(Text, nullable=False)
    categorie = Column(String(100), nullable=True)