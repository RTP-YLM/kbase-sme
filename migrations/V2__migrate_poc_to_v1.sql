-- =============================================================================
-- KbaseSME — Migrate POC → V1 (E1-2)
-- ย้ายข้อมูลจาก `documents` table (POC, 384-dim) → knowledge_sources + knowledge_chunks
-- หมายเหตุ: chunks ต้อง re-embed ด้วย BGE-M3 หลัง migrate (E3-1)
-- =============================================================================

-- Step 1: ย้าย documents → knowledge_sources
insert into knowledge_sources (
    id,
    tenant_id,
    title,
    filename,
    department,
    checksum,
    status,
    metadata,
    created_at
)
select
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,   -- default tenant
    coalesce(metadata->>'title', filename),
    coalesce(metadata->>'filename', 'unknown'),
    coalesce(metadata->>'department', 'general'),
    metadata->>'checksum',
    'active',
    metadata,
    now()
from documents
on conflict do nothing;

-- Step 2: knowledge_chunks เว้นว่างไว้ก่อน
-- เหตุผล: embedding เดิมเป็น 384-dim ใช้ด้วยกันกับ 1024-dim column ไม่ได้
-- ต้อง re-ingest ทุกไฟล์ผ่าน E3-1 (BGE-M3) หลังจากนี้

-- Step 3: Archive ตาราง POC เก่า (ไม่ drop เพื่อ safety)
alter table if exists documents rename to _documents_poc_archive;
alter table if exists embeddings rename to _embeddings_poc_archive;
