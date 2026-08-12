# Plan de Tests de Bout en Bout (B2B) pour MedAssist

Ce document définit la stratégie pour valider le flux complet de la consultation.

## 1. Scénario de Test Principal : "Consultation Standard"
**Objectif** : Valider que le flux, de l'audio jusqu'à la transmission SIH/PDF, est fonctionnel.

### Étapes :
1.  **Transcription** : Envoyer un fichier audio de test à `POST /stt/transcribe`.
    *   *Assertion* : Retourne une transcription textuelle correcte.
2.  **Analyse LLM** : Envoyer la transcription à `POST /consultations/extract-entities`.
    *   *Assertion* : Retourne un JSON structuré (diagnostics, traitements, etc.).
3.  **Codification** : Le système doit automatiquement lier les diagnostics/traitements à des codes (CIM-10/GMR).
    *   *Assertion* : Vérifier que les codes retournés sont cohérents (fuzzy matching).
4.  **Transmission SIH** : Appeler `POST /transmission/send` avec l'ID de la consultation.
    *   *Assertion* : Retourne statut "success".
5.  **Génération PDF** : Appeler `POST /pdf/generate` avec l'ID de la consultation.
    *   *Assertion* : Retourne un fichier PDF valide.

## 2. Outils recommandés
*   **Pytest** : Pour automatiser les tests backend (`backend/tests/`).
*   **Playwright / Cypress** : Pour tester le flux complet depuis l'interface utilisateur.

## 3. Exemple de test unitaire (Backend)
```python
# Exemple: backend/tests/test_flow.py
def test_full_consultation_flow(client):
    # 1. Transcription (Mock)
    # 2. Extraction LLM
    # 3. Validation Transmission
    response = client.post("/api/v1/transmission/send", json={"consultation_id": "test_id"})
    assert response.status_code == 200
    assert response.json()["status"] == "success"
```
