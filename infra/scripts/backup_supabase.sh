#!/usr/bin/env bash
# Backup knowledge_sources metadata จาก Supabase → local JSON
# (embedding vectors ไม่ backup — re-embed ได้จากไฟล์ต้นฉบับ)
#
# ต้องมี: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ใน environment

set -euo pipefail

BACKUP_DIR="$(cd "$(dirname "$0")/../.." && pwd)/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUT="$BACKUP_DIR/kbase_backup_$TIMESTAMP.json"

: "${SUPABASE_URL:?ต้องตั้ง SUPABASE_URL}"
: "${SUPABASE_SERVICE_ROLE_KEY:?ต้องตั้ง SUPABASE_SERVICE_ROLE_KEY}"

mkdir -p "$BACKUP_DIR"

echo "→ backup knowledge_sources + query logs → $OUT"

curl -sf \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/rest/v1/knowledge_sources?select=*&limit=10000" \
  > /tmp/kbase_sources.json

curl -sf \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/rest/v1/rag_query_logs?select=id,question,answered,latency_ms,created_at&limit=50000&order=created_at.desc" \
  > /tmp/kbase_logs.json

python3 -c "
import json, sys
data = {
    'timestamp': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
    'knowledge_sources': json.load(open('/tmp/kbase_sources.json')),
    'query_logs_sample': json.load(open('/tmp/kbase_logs.json')),
}
json.dump(data, open('$OUT', 'w'), ensure_ascii=False, indent=2)
print(f'✓ backup เสร็จ: $OUT ({len(data[\"knowledge_sources\"])} sources)')
"

# ลบ backup เก่ากว่า 30 วัน
find "$BACKUP_DIR" -name "kbase_backup_*.json" -mtime +30 -delete
