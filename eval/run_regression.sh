#!/usr/bin/env bash
# E8-3: Regression eval — รันก่อน release ทุกครั้ง
# ถ้า hit rate < 90% → exit 1 (block CI/CD)

set -euo pipefail

GOLDEN="${1:-data/golden_set.json}"
REPORT="eval/regression_$(date +%Y%m%d_%H%M%S).json"

echo "→ Running regression eval..."
echo "   golden: $GOLDEN"
echo "   report: $REPORT"

source .venv/bin/activate 2>/dev/null || true

python eval/eval.py --golden "$GOLDEN" --output "$REPORT"
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Regression passed — safe to release"
else
  echo "❌ Regression FAILED — ห้าม release จนกว่าจะผ่าน 90%"
fi

exit $EXIT_CODE
