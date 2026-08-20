FROM python:3.10-slim

WORKDIR /app

# Installation des dépendances système nécessaires pour C++ et l'audio (ffmpeg)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Mettre à jour pip avant d'installer les paquets Python
RUN pip install --no-cache-dir --upgrade pip

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Production-oriented command (no --reload). Use a compose override for local hot-reload if needed.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]