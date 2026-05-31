-- Supabase Production-Lite Schema for SME Knowledge Base RAG
-- This file defines the production tables, indexes, and RPC search functions.
-- Run this in your Supabase SQL Editor.

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Create knowledge_sources (Document Catalog)
create table if not exists knowledge_sources (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid,  -- Optional, for SaaS tenant isolation
    title text not null,
    filename text not null,
    department text default 'general',  -- e.g., 'hr', 'accounting', 'sales'
    source_type text default 'file',   -- e.g., 'file', 'google_drive', 'web'
    source_path text,
    checksum text,                     -- SHA256 checksum to prevent duplicate ingestion
    version int default 1,
    status text default 'active',      -- e.g., 'active', 'archived', 'processing'
    access_level text default 'internal', -- e.g., 'public', 'internal', 'confidential'
    metadata jsonb default '{}',
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Index on tenant_id, department, and checksum for fast lookups
create index if not exists knowledge_sources_tenant_idx on knowledge_sources (tenant_id);
create index if not exists knowledge_sources_checksum_idx on knowledge_sources (checksum);
create index if not exists knowledge_sources_department_idx on knowledge_sources (department);

-- 3. Create knowledge_chunks (Searchable Vector Chunks)
create table if not exists knowledge_chunks (
    id bigserial primary key,
    source_id uuid references knowledge_sources(id) on delete cascade,
    tenant_id uuid,                    -- Denormalized for fast filtering and RLS
    department text,                   -- Denormalized for fast filtering
    chunk_index int not null,
    content text not null,
    embedding vector(384) not null,    -- Matches paraphrase-multilingual-MiniLM-L12-v2
    token_count int,
    metadata jsonb default '{}',
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- HNSW index for vector similarity search (recommended for production)
create index if not exists knowledge_chunks_hnsw_embedding_idx 
on knowledge_chunks 
using hnsw (embedding vector_cosine_ops);

-- Alternative IVFFLAT index if HNSW is not supported on your Postgres version
-- create index if not exists knowledge_chunks_ivfflat_embedding_idx 
-- on knowledge_chunks 
-- using ivfflat (embedding vector_cosine_ops)
-- with (lists = 100);

-- Indexes for filtering
create index if not exists knowledge_chunks_tenant_idx on knowledge_chunks (tenant_id);
create index if not exists knowledge_chunks_department_idx on knowledge_chunks (department);
create index if not exists knowledge_chunks_source_idx on knowledge_chunks (source_id);

-- 4. Create RAG query logs (Analytics & Debugging)
create table if not exists rag_query_logs (
    id bigserial primary key,
    tenant_id uuid,
    user_id uuid,
    question text not null,
    answer text,
    retrieved_chunk_ids bigint[],
    top_similarity float,
    latency_ms int,
    llm_model text,
    feedback text,                     -- 'thumbs_up', 'thumbs_down', or text feedback
    created_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists rag_query_logs_tenant_idx on rag_query_logs (tenant_id);
create index if not exists rag_query_logs_created_at_idx on rag_query_logs (created_at desc);

-- 5. Create document_ingestion_jobs (Jobs Tracker)
create table if not exists document_ingestion_jobs (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid,
    source_id uuid references knowledge_sources(id) on delete cascade,
    status text default 'pending',     -- 'pending', 'running', 'completed', 'failed'
    error_message text,
    chunks_created int default 0,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. RPC Function for similarity search
create or replace function match_knowledge_chunks (
    query_embedding vector(384),
    match_count int default 5,
    filter_tenant_id uuid default null,
    filter_department text default null
)
returns table (
    id bigint,
    source_id uuid,
    content text,
    metadata jsonb,
    similarity float,
    department text
)
language plpgsql
as $$
#variable_conflict use_column
begin
    return query
    select
        kc.id,
        kc.source_id,
        kc.content,
        kc.metadata,
        1 - (kc.embedding <=> query_embedding) as similarity,
        kc.department
    from knowledge_chunks kc
    where 
        (filter_tenant_id is null or kc.tenant_id = filter_tenant_id)
        and (filter_department is null or kc.department = filter_department)
    order by kc.embedding <=> query_embedding
    limit match_count;
end;
$$;

-- 7. Trigger to automatically update updated_at in knowledge_sources
create or replace function update_modified_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_knowledge_sources_modtime
    before update on knowledge_sources
    for each row
    execute procedure update_modified_column();

-- 8. Grant privileges
grant usage on schema public to postgres, anon, authenticated, service_role;
grant select, insert, update, delete on knowledge_sources to postgres, anon, authenticated, service_role;
grant select, insert, update, delete on knowledge_chunks to postgres, anon, authenticated, service_role;
grant select, insert, update, delete on rag_query_logs to postgres, anon, authenticated, service_role;
grant select, insert, update, delete on document_ingestion_jobs to postgres, anon, authenticated, service_role;
grant execute on function match_knowledge_chunks to postgres, anon, authenticated, service_role;
