#!/usr/bin/env bash
# KbaseSME — Dev startup script
# รัน API server + Celery worker พร้อมกัน

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

source .env 2>/dev/null || { echo "❌ ต้องมี .env ก่อน — copy จาก .env.example"; exit 1; }
source .venv/bin/activate 2>/dev/null || true

echo "=== KbaseSME Dev Start ==="

# API server
echo "→ Starting API (port 8000)..."
PYTHONPATH=src APP_ENV=development .venv/bin/uvicorn main:app \
  --app-dir src --host 127.0.0.1 --port 8000 --log-level warning &
API_PID=$!

# Celery worker — pool=solo เพราะ macOS MPS fork ไม่ได้
echo "→ Starting Celery worker (--pool=solo)..."
PYTHONPATH=src .venv/bin/python3.11 -m celery -A worker worker \
  --loglevel=warning --pool=solo &
WORKER_PID=$!

echo "✅ API PID=$API_PID | Worker PID=$WORKER_PID"
echo "   Ctrl+C เพื่อหยุดทั้งคู่"

trap "kill $API_PID $WORKER_PID 2>/dev/null; echo 'stopped'" SIGINT SIGTERM
wait
