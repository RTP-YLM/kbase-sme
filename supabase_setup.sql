-- Supabase Vector Store Setup for RAG
-- Run this in Supabase SQL Editor

-- Enable pgvector extension
create extension if not exists vector;

-- Create documents table
create table if not exists documents (
    id bigserial primary key,
    content text not null,
    embedding vector(384) not null,  -- Match embedding model dimension
    metadata jsonb default '{}',
    collection text default 'default',
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create index for vector similarity search
create index if not exists documents_embedding_idx 
on documents 
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Create index for collection filtering
create index if not exists documents_collection_idx on documents (collection);

-- Create function for similarity search
create or replace function match_documents (
    query_embedding vector(384),
    match_count int default 5,
    filter_collection text default 'default'
)
returns table (
    id bigint,
    content text,
    metadata jsonb,
    similarity float
)
language plpgsql
as $$
#variable_conflict use_column
begin
    return query
    select
        id,
        content,
        metadata,
        1 - (documents.embedding <=> query_embedding) as similarity
    from documents
    where collection = filter_collection
    order by documents.embedding <=> query_embedding
    limit match_count;
end;
$$;

-- Grant permissions (adjust if using service role key)
grant usage on schema public to postgres, anon, authenticated, service_role;
grant select, insert, update, delete on documents to postgres, anon, authenticated, service_role;
grant execute on function match_documents to postgres, anon, authenticated, service_role;
