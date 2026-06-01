#!/usr/bin/env bash
# E9-4: Setup demo environment
# ingest ตัวอย่างเอกสาร 3 ไฟล์ เข้า Supabase (ต้องมี .env ก่อน)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
source "$ROOT/.env" 2>/dev/null || { echo "ต้องมี .env ก่อน — copy จาก .env.example"; exit 1; }

echo "=== KbaseSME Demo Setup ==="
echo "Supabase: $SUPABASE_URL"

source "$ROOT/.venv/bin/activate" 2>/dev/null || true

# ingest เอกสาร 3 ไฟล์ตัวอย่าง
python3 - <<'PYEOF'
import sys
sys.path.insert(0, 'src')

from document_loader import DocumentLoader
from embedder import BGEEmbedder
from supabase_vector_store import SupabaseVectorStore
from pathlib import Path

DOCS = [
    ("data/documents/01_hr_policy.md",        "hr",         "นโยบาย HR"),
    ("data/documents/02_accounting_policy.md", "accounting", "นโยบายบัญชี"),
    ("data/documents/03_sales_sop.md",         "sales",      "SOP ฝ่ายขาย"),
]

loader = DocumentLoader()
embedder = BGEEmbedder()
store = SupabaseVectorStore()

for filepath, department, label in DOCS:
    path = Path(filepath)
    if not path.exists():
        print(f"⚠️  ไม่พบไฟล์: {filepath}")
        continue

    print(f"\n→ ingest: {label} ({filepath})")
    source_info, chunks = loader.load_file(path)
    print(f"   chunks: {len(chunks)}")

    source_id = store.upsert_source(
        filename=source_info.filename,
        title=label,
        checksum=source_info.checksum,
        file_size_bytes=source_info.file_size_bytes,
        doc_type=source_info.doc_type,
        department=department,
        page_count=source_info.page_count,
    )

    texts = [c.content for c in chunks]
    embeddings = embedder.embed_batch(texts)
    store.upsert_chunks(source_id=source_id, chunks=chunks, embeddings=embeddings, department=department)
    print(f"   ✓ {source_id[:8]}... — {len(chunks)} chunks upserted")

total = store.count_chunks()
print(f"\n✅ Demo setup เสร็จ — {total} chunks ใน Supabase")
PYEOF
