-- Supabase RLS Policies for RAG POC
-- Run this in Supabase SQL Editor after supabase_setup.sql
-- WARNING: This is permissive for POC/local development.
-- For production, use service_role key on backend or tenant/user-scoped policies.

-- Enable RLS explicitly
alter table public.documents enable row level security;

-- Drop old POC policies if re-running
DROP POLICY IF EXISTS "POC allow anon read documents" ON public.documents;
DROP POLICY IF EXISTS "POC allow anon insert documents" ON public.documents;
DROP POLICY IF EXISTS "POC allow anon update documents" ON public.documents;
DROP POLICY IF EXISTS "POC allow anon delete documents" ON public.documents;

-- Allow anon/publishable key to read documents
CREATE POLICY "POC allow anon read documents"
ON public.documents
FOR SELECT
TO anon
USING (true);

-- Allow anon/publishable key to insert documents
CREATE POLICY "POC allow anon insert documents"
ON public.documents
FOR INSERT
TO anon
WITH CHECK (true);

-- Optional: allow update/delete for local POC cleanup
CREATE POLICY "POC allow anon update documents"
ON public.documents
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "POC allow anon delete documents"
ON public.documents
FOR DELETE
TO anon
USING (true);

-- Function execution for anon
GRANT EXECUTE ON FUNCTION public.match_documents(vector, int, text) TO anon;
