-- =============================================================================
-- KbaseSME — Production Schema (E1-1)
-- Version: 1.0 | Date: 2026-06-01
-- เปลี่ยนจาก POC schema: 384→1024 dim, เพิ่ม tenants/app_users/FTS/audit fields
-- =============================================================================

-- Enable extensions
create extension if not exists vector;
create extension if not exists pgcrypto;  -- for gen_random_uuid() + at-rest encryption

-- =============================================================================
-- 1. TENANTS — ข้อมูล DFY customer แต่ละราย
-- =============================================================================
create table if not exists tenants (
    id              uuid primary key default gen_random_uuid(),
    name            text not null,
    slug            text unique not null,           -- ใช้ใน subdomain / config lookup
    config          jsonb default '{}',             -- tenant-specific overrides (LLM, threshold ฯลฯ)
    plan            text default 'starter',         -- 'starter' | 'growth' | 'business'
    is_active       boolean default true,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

-- Single-tenant default (DFY phase)
insert into tenants (id, name, slug, plan)
values ('00000000-0000-0000-0000-000000000001', 'Default Tenant', 'default', 'growth')
on conflict do nothing;

-- =============================================================================
-- 2. APP USERS — พนักงาน + แอดมิน รวม LINE OA mapping
-- =============================================================================
create table if not exists app_users (
    id              uuid primary key default gen_random_uuid(),
    tenant_id       uuid not null references tenants(id) on delete cascade,
    email           text,
    employee_id     text,                           -- รหัสพนักงาน (optional)
    display_name    text,
    line_user_id    text,                           -- LINE UID สำหรับ webhook mapping
    line_picture_url text,
    role            text not null default 'user',   -- 'user' | 'admin'
    departments     text[] default '{}',            -- ['HR', 'Finance'] — ใช้ filter access
    access_level    int default 2,                  -- 1=public, 2=staff, 3=manager, 4=admin
    is_active       boolean default true,
    last_active_at  timestamptz,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now(),
    constraint app_users_email_tenant_unique unique (tenant_id, email),
    constraint app_users_line_tenant_unique  unique (tenant_id, line_user_id)
);

create index if not exists app_users_tenant_idx      on app_users (tenant_id);
create index if not exists app_users_line_user_idx   on app_users (line_user_id) where line_user_id is not null;
create index if not exists app_users_email_idx       on app_users (email) where email is not null;

-- =============================================================================
-- 3. KNOWLEDGE SOURCES — 1 แถว = 1 ไฟล์ต้นทาง
-- =============================================================================
create table if not exists knowledge_sources (
    id              uuid primary key default gen_random_uuid(),
    tenant_id       uuid not null references tenants(id) on delete cascade,
    title           text not null,
    filename        text not null,
    source_type     text default 'file',            -- 'file' | 'url' (future)
    department      text default 'general',         -- null = ทุกแผนก
    access_level    int default 2,                  -- 1=public, 2=staff, 3=manager, 4=admin
    checksum        text,                           -- SHA256 — dedup + versioning
    version         int default 1,
    status          text default 'active',          -- 'active' | 'archived' | 'processing'
    file_size_bytes bigint,
    page_count      int,
    metadata        jsonb default '{}',
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

create index if not exists knowledge_sources_tenant_idx      on knowledge_sources (tenant_id);
create index if not exists knowledge_sources_checksum_idx    on knowledge_sources (tenant_id, checksum);
create index if not exists knowledge_sources_dept_idx        on knowledge_sources (tenant_id, department);
create index if not exists knowledge_sources_status_idx      on knowledge_sources (tenant_id, status);

-- =============================================================================
-- 4. KNOWLEDGE CHUNKS — N chunks ต่อ source, มี vector + FTS
-- =============================================================================
create table if not exists knowledge_chunks (
    id              bigserial primary key,
    source_id       uuid not null references knowledge_sources(id) on delete cascade,
    tenant_id       uuid not null references tenants(id) on delete cascade,
    department      text,                           -- denormalized จาก source
    access_level    int default 2,                  -- denormalized จาก source
    chunk_index     int not null,
    content         text not null,
    content_tsv     tsvector,                       -- FTS — อัปเดตผ่าน trigger
    section_title   text,                           -- header/section ที่ chunk นี้สังกัด
    page_number     int,
    embedding       vector(1024) not null,          -- BGE-M3 1024-dim
    token_count     int,
    metadata        jsonb default '{}',             -- doc_type, source_filename, extra
    created_at      timestamptz default now()
);

-- HNSW index สำหรับ ANN vector search (cosine)
create index if not exists knowledge_chunks_hnsw_idx
    on knowledge_chunks using hnsw (embedding vector_cosine_ops)
    with (m = 16, ef_construction = 64);

-- GIN index สำหรับ FTS keyword search
create index if not exists knowledge_chunks_fts_idx
    on knowledge_chunks using gin (content_tsv);

-- Composite filter index (tenant + department + access_level)
create index if not exists knowledge_chunks_filter_idx
    on knowledge_chunks (tenant_id, department, access_level);

create index if not exists knowledge_chunks_source_idx
    on knowledge_chunks (source_id);

-- Trigger: อัปเดต content_tsv อัตโนมัติเมื่อ insert/update content
create or replace function update_content_tsv()
returns trigger as $$
begin
    new.content_tsv := to_tsvector('simple', coalesce(new.section_title, '') || ' ' || new.content);
    return new;
end;
$$ language plpgsql;

create trigger knowledge_chunks_tsv_trigger
    before insert or update of content, section_title
    on knowledge_chunks
    for each row execute function update_content_tsv();

-- =============================================================================
-- 5. DOCUMENT INGESTION JOBS — ติดตามสถานะ async ingest
-- =============================================================================
create table if not exists document_ingestion_jobs (
    id              uuid primary key default gen_random_uuid(),
    tenant_id       uuid not null references tenants(id) on delete cascade,
    source_id       uuid references knowledge_sources(id) on delete cascade,
    status          text default 'queued',          -- 'queued' | 'running' | 'done' | 'error'
    step            text,                           -- 'parse' | 'ocr' | 'chunk' | 'embed' | 'upsert'
    progress_pct    int default 0,                  -- 0–100
    chunks_created  int default 0,
    error_message   text,
    started_at      timestamptz,
    completed_at    timestamptz,
    created_at      timestamptz default now()
);

create index if not exists ingestion_jobs_tenant_idx  on document_ingestion_jobs (tenant_id, status);
create index if not exists ingestion_jobs_source_idx  on document_ingestion_jobs (source_id);

-- =============================================================================
-- 6. RAG QUERY LOGS — ทุก query + คำตอบ + feedback + latency
-- =============================================================================
create table if not exists rag_query_logs (
    id              bigserial primary key,
    tenant_id       uuid not null references tenants(id) on delete cascade,
    user_id         uuid references app_users(id),
    line_user_id    text,                           -- backup ถ้า user ยังไม่ map
    question        text not null,
    answered        boolean default false,
    answer          text,
    sources         jsonb default '[]',             -- [{source_id, title, section, rerank_score}]
    from_cache      boolean default false,
    rerank_top_score float,
    latency_ms      int,
    llm_model       text,
    input_tokens    int,
    output_tokens   int,
    feedback        text,                           -- 'correct' | 'wrong' | 'unclear'
    created_at      timestamptz default now()
);

create index if not exists rag_logs_tenant_idx     on rag_query_logs (tenant_id, created_at desc);
create index if not exists rag_logs_answered_idx   on rag_query_logs (tenant_id, answered);
create index if not exists rag_logs_user_idx       on rag_query_logs (user_id) where user_id is not null;

-- =============================================================================
-- 7. UPDATED_AT TRIGGER (ใช้กับ tenants, app_users, knowledge_sources)
-- =============================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger tenants_updated_at
    before update on tenants
    for each row execute function set_updated_at();

create trigger app_users_updated_at
    before update on app_users
    for each row execute function set_updated_at();

create trigger knowledge_sources_updated_at
    before update on knowledge_sources
    for each row execute function set_updated_at();

-- =============================================================================
-- 8. RPC FUNCTIONS
-- =============================================================================

-- 8a. Vector search (cosine)
create or replace function match_chunks_vector(
    query_embedding  vector(1024),
    p_tenant_id      uuid,
    p_department     text default null,
    p_access_level   int  default 2,
    match_count      int  default 20
)
returns table (
    id              bigint,
    source_id       uuid,
    content         text,
    section_title   text,
    page_number     int,
    metadata        jsonb,
    similarity      float,
    department      text,
    access_level    int
)
language plpgsql as $$
begin
    return query
    select
        kc.id,
        kc.source_id,
        kc.content,
        kc.section_title,
        kc.page_number,
        kc.metadata,
        1 - (kc.embedding <=> query_embedding) as similarity,
        kc.department,
        kc.access_level
    from knowledge_chunks kc
    where kc.tenant_id = p_tenant_id
      and kc.access_level <= p_access_level
      and (p_department is null or kc.department = p_department or kc.department is null)
    order by kc.embedding <=> query_embedding
    limit match_count;
end;
$$;

-- 8b. Keyword FTS search
create or replace function match_chunks_fts(
    query_text      text,
    p_tenant_id     uuid,
    p_department    text default null,
    p_access_level  int  default 2,
    match_count     int  default 20
)
returns table (
    id              bigint,
    source_id       uuid,
    content         text,
    section_title   text,
    page_number     int,
    metadata        jsonb,
    fts_rank        float,
    department      text,
    access_level    int
)
language plpgsql as $$
begin
    return query
    select
        kc.id,
        kc.source_id,
        kc.content,
        kc.section_title,
        kc.page_number,
        kc.metadata,
        ts_rank(kc.content_tsv, plainto_tsquery('simple', query_text))::float as fts_rank,
        kc.department,
        kc.access_level
    from knowledge_chunks kc
    where kc.tenant_id = p_tenant_id
      and kc.access_level <= p_access_level
      and (p_department is null or kc.department = p_department or kc.department is null)
      and kc.content_tsv @@ plainto_tsquery('simple', query_text)
    order by fts_rank desc
    limit match_count;
end;
$$;

-- =============================================================================
-- 9. GRANTS (สำหรับ Supabase service role)
-- =============================================================================
grant usage on schema public to postgres, service_role;
grant all on all tables in schema public to postgres, service_role;
grant all on all sequences in schema public to postgres, service_role;
grant execute on all functions in schema public to postgres, service_role;

-- ห้าม anon/authenticated เข้าตรง (backend เท่านั้น)
revoke all on all tables in schema public from anon, authenticated;
