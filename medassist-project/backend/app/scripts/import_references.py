import pandas as pd
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def import_csv_to_db(csv_path: str, table_name: str, column_mapping: dict):
    if not os.path.exists(csv_path):
        print(f"⚠️ Fichier non trouvé : {csv_path}")
        return

    print(f"📥 Importation de {csv_path} vers la table {table_name}...")
    
    # Lecture du fichier CSV (s'adapter au délimiteur : virgule ou point-virgule)
    df = pd.read_csv(csv_path, sep=';', encoding='utf-8')

    # Renommer les colonnes selon notre modèle PostgreSQL
    df = df.rename(columns=column_mapping)
    
    # Garder uniquement les colonnes utiles
    df = df[list(column_mapping.values())]

    # Insérer les données dans PostgreSQL
    df.to_sql(name=table_name, con=engine, if_exists='append', index=False)
    print(f"✅ Importation réussie pour {table_name} ({len(df)} lignes insérées).")

if __name__ == "__main__":
    # Définissez les chemins vers vos fichiers CSV
    DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

    # 1. CIM-10
    import_csv_to_db(
        csv_path=os.path.join(DATA_DIR, "cim10.csv"),
        table_name="ref_cim10",
        column_mapping={"CODE": "code", "LIBELLE": "libelle"}
    )

    # 2. NABM
    import_csv_to_db(
        csv_path=os.path.join(DATA_DIR, "nabm.csv"),
        table_name="ref_nabm",
        column_mapping={"CODE_ACTE": "code", "LIBELLE": "libelle", "COEFF": "coefficient"}
    )

    # 3. GMR
    import_csv_to_db(
        csv_path=os.path.join(DATA_DIR, "gmr.csv"),
        table_name="ref_gmr",
        column_mapping={"CODE": "code", "LIBELLE": "libelle", "CATEGORIE": "categorie"}
    )