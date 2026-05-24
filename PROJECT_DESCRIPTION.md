# SME Internal Knowledge Base RAG Platform

> Project description, product direction, architecture, and implementation blueprint for an AI-powered internal knowledge base built for Thai SME businesses.

---

## 1. Executive Summary

This project is a Proof of Concept (POC) for an **AI Internal Knowledge Base** product designed for Thai SME businesses. The system allows a company to upload internal documents such as HR policies, accounting procedures, sales SOPs, customer service guidelines, IT security rules, procurement policies, and compliance manuals. Employees can then ask questions in natural language and receive answers grounded in the company’s own documents.

The current implementation uses a classic Retrieval-Augmented Generation (RAG) architecture:

1. Source documents are placed in a local folder.
2. `ingest.py` loads and chunks those documents.
3. Each chunk is converted into a vector embedding.
4. Chunks and embeddings are stored in Supabase PostgreSQL with pgvector.
5. `query.py` embeds the user’s question.
6. Supabase searches for the most relevant chunks by vector similarity.
7. The retrieved context is sent to an LLM.
8. The LLM generates an answer based only on the retrieved context.

The current POC already works with:

- Thai language questions
- Markdown source documents
- Supabase + pgvector as vector database
- Alibaba DashScope / Qwen-compatible LLM API
- Local embedding model: `paraphrase-multilingual-MiniLM-L12-v2`
- Source citation with similarity score

This project is intended to evolve from a command-line POC into a production-ready SaaS or on-premise knowledge assistant for SMEs.

---

## 2. Product Vision

### 2.1 Vision Statement

Build an AI assistant that lets every SME employee ask business questions and get accurate answers from company knowledge, without needing to search through folders, PDFs, chat history, or old SOP documents.

### 2.2 Target Customer

Primary target:

- Thai SMEs with 10-200 employees
- Companies with scattered operational knowledge
- Businesses using LINE, Google Drive, shared folders, PDF manuals, Excel files, and informal SOPs
- Companies where new staff repeatedly ask the same questions
- Companies where knowledge lives in senior employees’ heads

Initial industries:

1. Retail and distribution
2. Clinics and healthcare service businesses
3. Accounting and legal firms
4. Manufacturing and warehouse-heavy SMEs
5. IT service providers
6. Real estate agencies
7. Professional service businesses
8. Franchise businesses

### 2.3 Core Value Proposition

The product reduces the time employees spend asking repetitive questions and searching documents.

Examples:

- HR staff no longer answer “ลากิจได้กี่วัน” repeatedly.
- Sales staff can quickly check discount approval rules.
- Customer service can check SLA rules instantly.
- Warehouse staff can ask stock counting procedures.
- Management can standardize internal knowledge across departments.

### 2.4 Product Positioning

Positioning statement:

> “AI Knowledge Assistant สำหรับ SME ไทย ที่ตอบคำถามจากเอกสารบริษัทจริง รองรับภาษาไทย ใช้งานง่าย และต่อยอดกับ LINE OA ได้”

Differentiators:

- Thai-first user experience
- SME-friendly pricing
- LINE OA integration potential
- Supports both SaaS and on-premise deployment
- Can start from messy company documents
- Provides source references to reduce hallucination risk
- Built around practical business use cases, not generic AI chat

---

## 3. Problem Statement

SME businesses often have valuable internal knowledge, but it is fragmented across many places:

- PDF files
- Word documents
- Google Drive folders
- LINE chat history
- Email threads
- Excel files
- Printed manuals
- Senior employees’ memory
- Department-specific SOPs

This creates several operational problems:

### 3.1 Repetitive Questions

Employees repeatedly ask the same questions:

- “ลาได้กี่วัน?”
- “เบิกค่าใช้จ่ายต้องส่งภายในกี่วัน?”
- “ลูกค้าแจ้งปัญหาระบบล่ม ต้อง escalate ยังไง?”
- “ฝ่ายขายลดราคาได้สูงสุดกี่เปอร์เซ็นต์?”
- “เอกสารสัญญามูลค่าเท่าไหร่ต้องให้กฎหมายตรวจ?”

### 3.2 Knowledge Bottleneck

Knowledge often sits with a few senior staff members. When they are unavailable, operations slow down.

### 3.3 Slow Onboarding

New employees take a long time to understand company rules, workflows, and department procedures.

### 3.4 Inconsistent Answers

Different staff members may answer the same question differently because they refer to different document versions or personal memory.

### 3.5 Poor Document Discoverability

Even when documents exist, employees may not know:

- Which file to open
- Which version is latest
- Which section contains the answer
- Whether the policy still applies

### 3.6 Management Blind Spot

Management cannot easily see:

- Which knowledge areas are frequently asked about
- Which documents are missing
- Which SOPs are outdated
- Which departments create the most support load

---

## 4. Proposed Solution

The proposed system is a RAG-powered knowledge assistant that lets users ask natural language questions and receive grounded answers from indexed company documents.

### 4.1 User Experience

A user asks:

```text
พนักงานลากิจได้กี่วัน
```

The system responds:

```text
ตามเอกสาร HR Policy พนักงานมีสิทธิ์ลากิจได้ 3 วันทำงานต่อปี

Source: hr_policy.md
Similarity: 0.78
```

### 4.2 System Behavior

The system should:

- Retrieve relevant internal document chunks
- Answer only from retrieved context
- Cite source documents
- Show similarity score or confidence signal
- Return “ไม่พบข้อมูลเพียงพอ” when the source is missing
- Support Thai questions and Thai documents
- Allow document updates and re-indexing

### 4.3 Supported Document Types in Current POC

Current loader supports:

- `.md`
- `.txt`
- `.pdf`
- `.docx`

### 4.4 Current POC Interfaces

Current interaction is command-line based:

```bash
python3 ingest.py
python3 query.py "พนักงานลากิจได้กี่วัน"
```

Future interfaces:

- Web admin dashboard
- Web chat UI
- LINE OA bot
- Slack / Microsoft Teams bot
- REST API for integration

---

## 5. Current Project Status

### 5.1 Working Directory

```text
/Users/rtp-ylm/utilPow/rag-sideproject
```

### 5.2 Current Major Files

```text
config.yaml                    # Main config for LLM, RAG, Supabase
.env                           # Local environment variables, not for git
.env.example                   # Example environment file
requirements.txt               # Python dependencies

src/config.py                  # YAML config loader with .env expansion
src/document_loader.py         # Loads and chunks .md, .txt, .pdf, .docx
src/llm_provider.py            # LLM provider abstraction
src/rag_engine.py              # Core RAG orchestration
src/supabase_vector_store.py   # Supabase pgvector integration

ingest.py                      # Ingest documents into vector store
query.py                       # Ask questions from CLI
test_setup.py                  # Basic setup test
test_supabase.py               # Supabase connectivity test
debug_supabase_retrieval.py    # Raw retrieval debugging

supabase_setup.sql             # Table, index, and RPC setup for Supabase
supabase_poc_policies.sql      # Permissive POC RLS policies
README_SUPABASE.md             # Supabase setup guide
PROJECT_DESCRIPTION.md         # This document
```

### 5.3 Current Data Folder

```text
data/documents/
```

Mock documents currently created:

```text
01_hr_policy.md
02_accounting_policy.md
03_sales_sop.md
04_customer_service_sop.md
05_it_security_policy.md
06_operations_sop.md
07_procurement_policy.md
08_marketing_guideline.md
09_warehouse_policy.md
10_legal_compliance_policy.md
hr_policy.md
```

### 5.4 Current Vector Store

Current production-direction vector store:

```text
Supabase PostgreSQL + pgvector
```

Current table:

```text
documents
```

Important columns:

```text
id
content
embedding
metadata
collection
created_at
```

### 5.5 Current LLM

Configured provider:

```yaml
provider: alibaba
model: qwen3.5-flash
base_url: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

API key should be loaded from `.env`, not hardcoded in `config.yaml`.

### 5.6 Current Embedding Model

```yaml
embedding_model: paraphrase-multilingual-MiniLM-L12-v2
```

Embedding dimension:

```text
384
```

Reason for using this model:

- Lightweight
- Works locally
- Supports multilingual text better than English-only MiniLM
- Good enough for Thai POC testing

---

## 6. Current RAG Flow

### 6.1 Ingestion Flow

Command:

```bash
python3 ingest.py
```

Detailed flow:

```text
1. Load config.yaml and .env
2. Initialize DocumentLoader
3. Scan data/documents/
4. Load supported files
5. Extract text
6. Split text into chunks
7. Initialize RAGEngine
8. Load embedding model
9. Connect to Supabase
10. Convert each chunk to embedding
11. Insert content + embedding + metadata into Supabase documents table
12. Print collection stats
```

### 6.2 Query Flow

Command:

```bash
python3 query.py "เวลาเข้างานพนักงาน"
```

Detailed flow:

```text
1. Receive user question
2. Load config.yaml and .env
3. Initialize RAGEngine
4. Convert question into embedding vector
5. Call Supabase RPC match_documents()
6. Supabase compares query vector with stored chunk vectors
7. Return top matching chunks with similarity score
8. Filter by similarity_threshold
9. Build context prompt
10. Send context + question to LLM
11. LLM returns grounded answer
12. CLI prints answer, query time, sources, similarity
```

### 6.3 Example Query

Input:

```text
เวลาเข้างานพนักงาน
```

Retrieved source:

```text
01_hr_policy.md or hr_policy.md
```

Answer:

```text
เวลาเข้างานปกติของพนักงานคือ 09:00 น. และเลิกงานเวลา 18:00 น.
```

---

## 7. Supabase Design in Current POC

### 7.1 Current SQL Table

Current SQL setup creates one table:

```sql
create table if not exists documents (
    id bigserial primary key,
    content text not null,
    embedding vector(384) not null,
    metadata jsonb default '{}',
    collection text default 'default',
    created_at timestamp with time zone default timezone('utc'::text, now())
);
```

### 7.2 Current Metadata Structure

Each row stores chunk information in `metadata`:

```json
{
  "source": "data/documents/01_hr_policy.md",
  "filename": "01_hr_policy.md",
  "chunk": 0,
  "total_chunks": 1
}
```

Meaning:

- `filename`: source file name
- `source`: original file path
- `chunk`: chunk index
- `total_chunks`: total chunks generated from that file

### 7.3 Current Vector Search Function

The current RPC function:

```sql
match_documents(
  query_embedding vector(384),
  match_count int,
  filter_collection text
)
```

Returns:

```text
id
content
metadata
similarity
```

Similarity is already calculated inside SQL:

```sql
1 - (documents.embedding <=> query_embedding) as similarity
```

Important implementation note:

The Python code must use this returned similarity directly. It must not calculate `1 - similarity` again.

---

## 8. Production Data Architecture Recommendation

The current POC uses one `documents` table. This is acceptable for a POC but not ideal for production.

For production, the system should separate:

```text
1. Source catalog
2. Document chunks
3. Embeddings
4. Query logs
5. User/tenant permissions
```

### 8.1 Recommended Production Tables

#### `knowledge_sources`

Represents original uploaded documents.

```sql
create table knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  title text not null,
  filename text not null,
  department text,
  source_type text default 'file',
  source_path text,
  checksum text,
  version int default 1,
  status text default 'active',
  access_level text default 'internal',
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

#### `knowledge_chunks`

Represents searchable chunks generated from sources.

```sql
create table knowledge_chunks (
  id bigserial primary key,
  source_id uuid references knowledge_sources(id) on delete cascade,
  tenant_id uuid,
  department text,
  chunk_index int not null,
  content text not null,
  embedding vector(384) not null,
  token_count int,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
```

#### `rag_query_logs`

Stores query history for analytics and debugging.

```sql
create table rag_query_logs (
  id bigserial primary key,
  tenant_id uuid,
  user_id uuid,
  question text not null,
  answer text,
  retrieved_chunk_ids bigint[],
  top_similarity float,
  latency_ms int,
  llm_model text,
  feedback text,
  created_at timestamptz default now()
);
```

#### `document_ingestion_jobs`

Tracks ingestion status.

```sql
create table document_ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  source_id uuid,
  status text,
  error_message text,
  chunks_created int default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);
```

### 8.2 Why Production Needs a Source Catalog

A source catalog is required for:

- Version control
- Duplicate detection
- Re-indexing one file
- Deleting old chunks
- Department filtering
- Access control
- Admin dashboard
- Audit trail
- Debugging hallucination or wrong answers

Without a catalog, the system becomes hard to operate once documents exceed a few dozen files.

---

## 9. Production Ingestion Strategy

### 9.1 Current POC Limitation

Current `ingest.py` inserts documents every time it runs. This can create duplicate rows if run repeatedly.

Example:

```text
Run 1: 11 rows
Run 2: 22 rows
Run 3: 33 rows
```

This is acceptable for early experimentation but not acceptable for production.

### 9.2 Production Ingestion Requirements

Production ingestion should support:

- File checksum detection
- Skip unchanged files
- Re-index changed files
- Delete chunks for removed files
- Track ingestion status
- Validate file type
- Extract metadata
- Support batch jobs
- Support tenant isolation
- Support rollback

### 9.3 Recommended File Checksum Flow

```text
1. Read source file
2. Calculate SHA256 checksum
3. Check knowledge_sources for same filename + checksum
4. If same checksum exists and active, skip
5. If filename exists but checksum changed, create new version
6. Delete old active chunks or mark previous source archived
7. Chunk new content
8. Insert new chunks
9. Mark source active
```

### 9.4 Recommended Source Folder Structure

For local development:

```text
data/documents/
├── hr/
│   ├── hr_policy_2026.md
│   └── leave_policy.md
├── accounting/
│   ├── expense_claim.md
│   └── invoice_process.md
├── sales/
│   ├── sales_sop.md
│   └── discount_policy.md
├── customer_service/
│   └── sla_policy.md
├── it/
│   └── security_policy.md
├── operations/
│   └── delivery_sop.md
├── procurement/
│   └── purchase_policy.md
├── marketing/
│   └── brand_guideline.md
├── warehouse/
│   └── stock_policy.md
└── legal/
    └── pdpa_policy.md
```

The folder name can become the department metadata.

---

## 10. Security and Access Control

### 10.1 Current POC Security

Current POC uses a permissive RLS policy for local testing with a publishable key.

This is not production-safe.

### 10.2 Production Security Direction

Production should use:

- Backend-only service role key
- Never expose service role key to frontend
- Tenant-level isolation
- User authentication
- Department-level access control
- Row Level Security policies
- Query logging
- Secrets in environment variables only

### 10.3 Access Control Example

User belongs to:

```json
{
  "tenant_id": "company_a",
  "departments": ["sales", "customer_service"],
  "access_level": "internal"
}
```

Query should only search:

```sql
where tenant_id = 'company_a'
and department in ('sales', 'customer_service')
and access_level in ('public', 'internal')
```

### 10.4 Sensitive Documents

Examples of restricted documents:

- Salary bands
- Legal contracts
- Management reports
- Customer personal data
- Vendor pricing
- Financial statements

These should require explicit permission and should not be available through a general company-wide chatbot.

---

## 11. Product Features

### 11.1 MVP Features

Required MVP features:

- Upload or place documents
- Ingest documents into vector DB
- Ask questions in Thai
- Retrieve relevant chunks
- Generate answer with source citation
- Show source filename and similarity
- Return “not enough information” when no source is found
- Basic config-driven LLM provider
- Supabase vector storage

### 11.2 Admin Features

Future admin dashboard should include:

- Document list
- Upload document
- Re-index document
- Delete/archive document
- See ingestion status
- See chunk count per file
- See last updated date
- See query logs
- See unanswered questions
- See low-confidence answers

### 11.3 User Features

End-user interface should include:

- Chat input
- Answer display
- Source citation
- “Open source document” link
- Feedback buttons: correct / wrong / unclear
- Suggested follow-up questions

### 11.4 Integration Features

Potential integrations:

- LINE OA
- Google Drive
- Microsoft SharePoint
- Slack
- Microsoft Teams
- Notion
- Email ingestion
- Web crawler for internal wiki

---

## 12. Suggested Product Tiers

### 12.1 Starter

For small teams.

Features:

- Up to 10 users
- Up to 200 documents
- Web chat
- Basic document upload
- Basic source citation
- Monthly support

Suggested price:

```text
4,900 THB/month
```

### 12.2 Growth

For active SMEs.

Features:

- Up to 50 users
- Up to 2,000 documents
- Department filtering
- LINE OA integration
- Query analytics
- Admin dashboard
- Priority support

Suggested price:

```text
14,900 THB/month
```

### 12.3 Business

For larger SMEs or regulated customers.

Features:

- Up to 200 users
- Custom permissions
- Multiple departments
- Audit logs
- On-premise or private cloud option
- Custom integrations
- SLA support

Suggested price:

```text
39,900 THB/month
```

### 12.4 Implementation Fee

Recommended one-time setup:

```text
50,000 - 200,000 THB
```

Depends on:

- Number of documents
- Data cleaning effort
- Integration requirements
- LINE OA setup
- Permission model
- On-premise requirement

---

## 13. Architecture

### 13.1 Current POC Architecture

```text
Local Markdown/PDF/DOCX files
        |
        v
ingest.py
        |
        v
DocumentLoader
        |
        v
Text chunks
        |
        v
SentenceTransformer embeddings
        |
        v
Supabase documents table + pgvector
        |
        v
query.py
        |
        v
match_documents RPC
        |
        v
Retrieved context
        |
        v
Qwen LLM
        |
        v
Answer with source
```

### 13.2 Production Architecture

```text
                +-------------------+
                |   Admin Portal    |
                +---------+---------+
                          |
                          v
                +-------------------+
                | Document Service  |
                +---------+---------+
                          |
                          v
                +-------------------+
                | Ingestion Worker  |
                +---------+---------+
                          |
                          v
+-------------+   +-------------------+   +-------------------+
| File Store  |   |  Knowledge Tables |   |  Vector Embedding |
| S3/Supabase |   |    PostgreSQL     |   |     pgvector      |
+-------------+   +-------------------+   +-------------------+
                          ^
                          |
                +---------+---------+
                |   RAG API Service |
                +---------+---------+
                          |
        +-----------------+-----------------+
        |                 |                 |
        v                 v                 v
   Web Chat           LINE OA          Internal API
```

### 13.3 Recommended Services

- `document-service`: manages source files and metadata
- `ingestion-worker`: parses, chunks, embeds documents
- `rag-api`: handles user questions and retrieval
- `chat-ui`: user-facing web interface
- `admin-ui`: document and system management
- `line-bot`: LINE OA integration

---

## 14. Technology Stack

### 14.1 Current POC Stack

```text
Language: Python 3
Vector DB: Supabase PostgreSQL + pgvector
Embedding: sentence-transformers
LLM: Alibaba DashScope compatible API / Qwen
Document parsing: pypdf, python-docx, markdown/text loader
Config: YAML + python-dotenv
Interface: CLI
```

### 14.2 Recommended Production Stack

Backend:

```text
Python FastAPI
Celery/RQ/Arq for ingestion jobs
Supabase PostgreSQL + pgvector
Supabase Storage or S3-compatible storage
Redis for queues/cache if needed
```

Frontend:

```text
Next.js or React
Tailwind CSS
Chat UI
Admin dashboard
```

Deployment:

```text
Docker Compose for SME/on-premise
Cloud Run / Render / Railway / Fly.io for SaaS MVP
Supabase managed PostgreSQL
```

Observability:

```text
Structured logs
Query logs
Latency metrics
Error tracking
LLM cost tracking
```

---

## 15. Prompting Strategy

The LLM should be instructed to:

- Answer only from provided context
- Cite source numbers
- Be concise
- Refuse when information is missing
- Avoid inventing policies
- Use Thai by default when user asks in Thai

Current prompt concept:

```text
You are a helpful assistant answering questions based on the provided context.

Context:
[Source 1]: ...

Question: ...

Instructions:
- Answer based ONLY on the context provided
- If the answer is not in the context, say "I don't have enough information to answer this question"
- Be concise and direct
- Cite sources when possible
```

Recommended production improvements:

- Include document title
- Include department
- Include effective date
- Include version
- Include confidence policy
- Include language instruction
- Include answer format

Example production answer format:

```text
คำตอบ:
...

อ้างอิง:
- HR Policy 2026, Section: การลา, Chunk 2, Similarity 0.82

หมายเหตุ:
หากต้องการยืนยันนโยบายล่าสุด กรุณาติดต่อฝ่าย HR
```

---

## 16. Evaluation Strategy

Production RAG requires evaluation, not only manual testing.

### 16.1 Golden Test Set

Create a set of expected questions and answers:

```json
[
  {
    "question": "พนักงานลากิจได้กี่วัน",
    "expected_source": "01_hr_policy.md",
    "expected_answer_contains": ["3 วัน"]
  },
  {
    "question": "ฝ่ายขายลดราคาได้สูงสุดกี่เปอร์เซ็นต์",
    "expected_source": "03_sales_sop.md",
    "expected_answer_contains": ["10%"]
  }
]
```

### 16.2 Metrics

Track:

- Retrieval accuracy
- Answer faithfulness
- Source citation correctness
- Latency
- No-answer correctness
- User feedback
- Cost per query

### 16.3 Failure Modes to Test

- Relevant document exists but not retrieved
- Retrieved document is correct but answer is wrong
- No relevant document but LLM hallucinates
- Old policy conflicts with new policy
- User asks ambiguous department question
- User asks restricted information
- Thai wording differs from document wording

---

## 17. Known Limitations

### 17.1 Current POC Limitations

- No web UI
- No API server yet
- No authentication
- No tenant model
- No access control
- No document versioning
- No duplicate prevention
- No `--reset` ingest option
- No source catalog
- No query logs
- No evaluation suite
- No file upload UI
- No production RLS model
- No streaming response
- No reranking model
- No hybrid search

### 17.2 Retrieval Limitations

Current retrieval uses vector similarity only.

Potential issues:

- Exact keyword matches may sometimes be missed
- Acronyms may retrieve poorly
- Short Thai phrases may be ambiguous
- Multiple departments may contain similar policy language
- Older duplicated documents can pollute retrieval

### 17.3 Suggested Retrieval Improvements

Future improvements:

- Hybrid search: vector + keyword
- Metadata filters: department, document type, access level
- Reranking model
- Query rewriting
- Multi-query retrieval
- Better Thai embedding model
- Section-aware chunking

---

## 18. Roadmap

### Phase 0: Current POC

Status: mostly complete.

Completed:

- CLI ingestion
- CLI query
- Supabase pgvector integration
- Thai mock documents
- Source citation
- Similarity score

### Phase 1: Production-Lite Data Model

Goals:

- Add `knowledge_sources`
- Add `knowledge_chunks`
- Add checksum
- Add `--reset`
- Add duplicate prevention
- Add source versioning
- Add department metadata

Deliverables:

- `supabase_production_schema.sql`
- Updated `ingest.py`
- Updated `query.py`
- Migration guide from `documents` table

### Phase 2: FastAPI Backend

Goals:

- Create REST API
- Add `/query`
- Add `/documents`
- Add `/ingest`
- Add `/health`
- Add structured response format

Example endpoint:

```http
POST /api/query
Content-Type: application/json

{
  "question": "เวลาเข้างานพนักงาน",
  "department": "hr"
}
```

### Phase 3: Web UI

Goals:

- Simple chat UI
- Source panel
- Document upload
- Admin document list
- Query history

### Phase 4: LINE OA Integration

Goals:

- Receive LINE messages
- Map LINE user to tenant/user
- Query RAG API
- Return answer with short source citation

### Phase 5: Production Hardening

Goals:

- Auth
- Tenant isolation
- Proper RLS
- Service role backend usage
- Logging
- Error tracking
- Cost tracking
- Deployment scripts

### Phase 6: Commercial Pilot

Goals:

- Deploy for 1-3 pilot SMEs
- Collect real documents
- Create onboarding process
- Measure usage and answer quality
- Prepare sales deck and demo environment

---

## 19. Suggested Implementation Plan

### Task 1: Add Reset Ingestion

Objective:

Add a safe reset option for local POC.

Command target:

```bash
python3 ingest.py --reset
```

Expected behavior:

- Delete existing rows for collection `documents`
- Re-ingest all files
- Avoid duplicates during repeated testing

### Task 2: Add Document Catalog Schema

Objective:

Create production-lite schema with `knowledge_sources` and `knowledge_chunks`.

Files:

```text
supabase_production_schema.sql
src/knowledge_store.py
```

### Task 3: Refactor Ingestion to Source/Chunk Model

Objective:

Change ingestion from one-table `documents` model to source/chunk model.

Expected behavior:

- One row per source document
- Multiple rows per chunk
- Chunks link to source by `source_id`

### Task 4: Add Checksum-Based Deduplication

Objective:

Prevent repeated ingestion of unchanged files.

Expected behavior:

- Same file checksum = skip
- Changed file checksum = new version or re-index

### Task 5: Add Query Logs

Objective:

Store question, answer, sources, latency, and similarity.

### Task 6: Add FastAPI Query Endpoint

Objective:

Expose RAG through HTTP.

### Task 7: Add Minimal Web Chat

Objective:

Create a simple UI for demos.

### Task 8: Add LINE OA Adapter

Objective:

Allow users to ask questions through LINE.

---

## 20. Demo Script

### 20.1 Setup

```bash
cd /Users/rtp-ylm/utilPow/rag-sideproject
python3 ingest.py
```

### 20.2 Sample Questions

HR:

```bash
python3 query.py "พนักงานลากิจได้กี่วัน"
python3 query.py "เวลาเข้างานพนักงานคือกี่โมง"
python3 query.py "ทดลองงานกี่วัน"
```

Accounting:

```bash
python3 query.py "เบิกค่าใช้จ่ายต้องส่งภายในกี่วัน"
python3 query.py "เงินเดือนจ่ายวันที่เท่าไหร่"
python3 query.py "วงเงินเกิน 50000 ใครอนุมัติ"
```

Sales:

```bash
python3 query.py "ฝ่ายขายให้ส่วนลดได้กี่เปอร์เซ็นต์"
python3 query.py "ใบเสนอราคามีอายุกี่วัน"
python3 query.py "ต้องติดตามลูกค้าหลังส่งใบเสนอราคาภายในกี่วัน"
```

Customer Service:

```bash
python3 query.py "LINE OA ต้องตอบลูกค้าภายในกี่นาที"
python3 query.py "ปัญหา P1 ต้องแก้ภายในกี่ชั่วโมง"
```

IT:

```bash
python3 query.py "รหัสผ่านต้องมีกี่ตัวอักษร"
python3 query.py "backup ระบบสำคัญต้องทำบ่อยแค่ไหน"
```

Legal:

```bash
python3 query.py "สัญญามูลค่าเท่าไหร่ต้องให้ฝ่ายกฎหมายตรวจ"
python3 query.py "ถ้าพบเหตุผิดกฎหมายต้องรายงานภายในกี่ชั่วโมง"
```

---

## 21. Business Model

### 21.1 SaaS Subscription

Recurring monthly revenue.

Good for:

- SMEs with low IT complexity
- Customers who want quick setup
- Standard document volume

### 21.2 Implementation + Monthly Support

One-time implementation plus recurring support.

Good for:

- Customers with messy documents
- Customers needing LINE OA
- Customers needing workflow customization

### 21.3 On-Premise / Private Deployment

Higher-ticket deployment.

Good for:

- Healthcare
- Finance
- Legal
- Customers with strict data privacy requirements

---

## 22. Commercial Risks

### 22.1 Data Quality Risk

If customer documents are outdated or inconsistent, AI answers may be wrong.

Mitigation:

- Document audit during onboarding
- Source catalog
- Versioning
- Admin review workflow

### 22.2 Hallucination Risk

LLM may answer beyond source context.

Mitigation:

- Strict prompt
- Similarity threshold
- No-answer policy
- Source citation
- Evaluation set

### 22.3 Security Risk

Sensitive documents may be exposed to unauthorized users.

Mitigation:

- Tenant isolation
- Department permissions
- RLS
- Backend-only service role key
- Audit logs

### 22.4 Adoption Risk

Employees may not use another new tool.

Mitigation:

- LINE OA integration
- Simple web chat
- Good onboarding
- Focus on repetitive questions

### 22.5 Cost Risk

LLM cost may grow with usage.

Mitigation:

- Use cheaper model for simple answers
- Cache frequent questions
- Monitor cost per query
- Use local models for some customers

---

## 23. Definition of Done for POC

The POC is considered successful when:

- At least 10 department documents are ingested
- At least 30 sample questions are answered correctly
- Each answer includes source filename
- Retrieval similarity is visible
- No-answer behavior works for unknown questions
- Supabase vector search works reliably
- Re-ingestion does not create uncontrolled duplicates, or reset is available
- A demo script can be run by another developer

---

## 24. Next Recommended Step

The most valuable next step is to convert the current POC into a production-lite foundation:

```text
Current:
documents table only

Next:
knowledge_sources + knowledge_chunks + query_logs
```

This unlocks:

- Better admin dashboard
- Better source tracing
- Re-indexing
- Versioning
- Department filters
- Access control
- Real customer pilots

Recommended immediate implementation order:

1. Add `--reset` to `ingest.py`
2. Add production schema SQL
3. Refactor ingestion into `knowledge_sources` and `knowledge_chunks`
4. Add query logs
5. Add FastAPI `/query`
6. Add minimal web UI

---

## 25. One-Line Project Description

An AI-powered internal knowledge base for Thai SMEs that indexes company documents into Supabase pgvector and answers employee questions in Thai using RAG with source citations.

---

## 26. Short Thai Description

โปรเจกต์นี้คือระบบ AI Knowledge Base สำหรับ SME ไทย ใช้แนวทาง RAG เพื่อให้พนักงานถามคำถามจากเอกสารบริษัท เช่น HR Policy, SOP, Finance Rule, Sales Process, Customer Service SLA และเอกสาร Compliance ได้โดยตรง ระบบจะค้นหาเนื้อหาที่เกี่ยวข้องจาก Supabase pgvector แล้วส่ง context ให้ LLM ตอบกลับพร้อมแหล่งอ้างอิง ลดเวลาค้นหาเอกสาร ลดคำถามซ้ำ และช่วยให้ความรู้ภายในองค์กรถูกใช้งานได้จริง

---

## 27. Long Thai Description

ระบบนี้ถูกออกแบบเพื่อแก้ปัญหาความรู้ภายในองค์กร SME ที่กระจัดกระจายอยู่ในหลายรูปแบบ เช่น PDF, Word, Markdown, Google Drive, LINE Chat หรือความจำของพนักงานอาวุโส โดยใช้ Retrieval-Augmented Generation (RAG) เป็นแกนหลัก เมื่อผู้ใช้ถามคำถาม ระบบจะแปลงคำถามเป็น embedding vector แล้วค้นหา chunk ของเอกสารที่ใกล้เคียงที่สุดจาก Supabase PostgreSQL ที่เปิดใช้ pgvector จากนั้นนำเนื้อหาที่เกี่ยวข้องส่งให้ LLM สรุปคำตอบ โดยยึดจากข้อมูลในเอกสารเท่านั้น พร้อมแสดง source และ similarity score เพื่อให้ตรวจสอบย้อนกลับได้

เป้าหมายระยะยาวคือพัฒนาเป็น product ที่ขายให้ SME ได้จริง ทั้งในรูปแบบ SaaS, private deployment และ on-premise สำหรับลูกค้าที่มีข้อกำหนดด้านข้อมูล โดย roadmap จะต่อยอดจาก CLI POC ไปสู่ FastAPI backend, Web Chat UI, Admin Dashboard, Document Catalog, Query Logs, Access Control และ LINE OA Integration

---

## 28. Maintenance Notes

Important notes for future maintainers:

- Do not hardcode API keys in `config.yaml`.
- Keep secrets in `.env` only.
- For production, do not use permissive anon RLS policies.
- Use service role key only from backend services.
- Do not run repeated ingest without reset or deduplication.
- Always check source citations when validating answer quality.
- If retrieval returns no sources, inspect:
  1. document count
  2. RPC raw result
  3. similarity threshold
  4. collection filter
  5. embedding dimension
- If Supabase similarity looks wrong, remember SQL already returns similarity, not distance.

---

## 29. Useful Commands

```bash
# Go to project
cd /Users/rtp-ylm/utilPow/rag-sideproject

# Install dependencies
pip3 install -r requirements.txt

# Test Supabase setup
python3 test_supabase.py

# Ingest documents
python3 ingest.py

# Ask a question
python3 query.py "พนักงานลากิจได้กี่วัน"

# Debug raw Supabase retrieval
python3 debug_supabase_retrieval.py
```

---

## 30. Final Product Direction

The project should not remain a simple chatbot. The strongest product direction is:

```text
SME AI Knowledge Operations Platform
```

Not just:

```text
Chat with PDF
```

The difference:

| Chat with PDF | Knowledge Operations Platform |
|---|---|
| Upload files and ask | Manage company knowledge lifecycle |
| Single-user demo | Multi-department business tool |
| Weak source control | Versioned document catalog |
| No governance | Access control and audit logs |
| Hard to sell high-ticket | Can sell implementation + subscription |

The commercial opportunity is not only answering questions. It is helping SMEs structure, govern, search, and operationalize their internal knowledge.
