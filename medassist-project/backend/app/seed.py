import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import SessionLocal, init_db
from app.models.coding import ICD10Code, GMRCode, NABMCode


def upsert_code(db, model_class, code, label):
    existing = db.query(model_class).filter(model_class.code == code).first()
    if existing:
        existing.label = label
        return existing

    new_item = model_class(code=code, label=label)
    db.add(new_item)
    return new_item


def seed_database():
    init_db()
    db = SessionLocal()

    try:
        # Données CIM-10 (Diagnostics)
        for code, label in [
            ("I10", "Hypertension artérielle"),
            ("E11", "Diabète de type 2"),
        ]:
            upsert_code(db, ICD10Code, code, label)

        # Données GMR (Médicaments)
        for code, label in [
            ("GMR-MET-850", "Metformine 850mg"),
            ("GMR-AML-5", "Amlodipine 5mg"),
        ]:
            upsert_code(db, GMRCode, code, label)

        # Données NABM (Biologie)
        for code, label in [
            ("0552", "Glycémie à jeun"),
            ("0520", "Hémoglobine glyquée (HbA1c)"),
        ]:
            upsert_code(db, NABMCode, code, label)

        db.commit()
        print("Base de données initialisée avec succès !")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()