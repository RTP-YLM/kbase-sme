# RAG Side Project - Supabase Setup

## 🚀 Quick Start

### 1. ติดตั้ง Supabase Package

```bash
pip install -r requirements.txt
```

### 2. สร้าง Supabase Project

1. ไปที่ https://supabase.com
2. สร้าง project ใหม่
3. รอจน project พร้อมใช้งาน

### 3. รัน SQL Setup

1. เปิด **SQL Editor** ใน Supabase Dashboard
2. Copy เนื้อหาจากไฟล์ `supabase_setup.sql`
3. Paste และรัน SQL

SQL จะสร้าง:
- `documents` table พร้อม pgvector
- Index สำหรับ similarity search
- `match_documents()` function สำหรับ query

### 4. ตั้งค่า Environment Variables

Copy `.env.example` เป็น `.env`:

```bash
cp .env.example .env
```

แก้ไข `.env`:

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGc...  # anon key หรือ service_role key

# LLM (ถ้าใช้ Alibaba)
ALIBABA_API_KEY=sk-...
```

### 5. ทดสอบ

```bash
# Ingest documents
python3 ingest.py

# Query
python3 query.py "คำถามของคุณ"
```

---

## 📊 โครงสร้าง Database

```sql
documents (
    id              bigserial primary key
    content         text not null
    embedding       vector(384) not null
    metadata        jsonb default '{}'
    collection      text default 'default'
    created_at      timestamp default now()
)
```

---

## 🔑 Supabase Keys

### Anon Key (public)
- ใช้สำหรับ client-side apps
- มี RLS (Row Level Security) ป้องกัน

### Service Role Key (private)
- ใช้สำหรับ server-side
- bypass RLS
- **ห้าม expose ให้ client**

**แนะนำ:** ใช้ `service_role key` สำหรับ RAG backend (รันบน server)

---

## 📝 การใช้งาน

### Config

แก้ไข `config.yaml`:

```yaml
rag:
  vector_store: supabase
  supabase_url: ${SUPABASE_URL}
  supabase_key: ${SUPABASE_KEY}
  supabase_table: documents
```

### Ingest

```bash
python3 ingest.py data/documents
```

### Query

```bash
python3 query.py "พนักงานลากิจได้กี่วัน"
```

---

## 🔄 Switch กลับไป Chroma

ถ้าอยากทดสอบกับ Chroma ก่อน:

```yaml
rag:
  vector_store: chroma  # เปลี่ยนจาก supabase
  persist_directory: ./data/vectorstore
```

---

## 🛠️ Troubleshooting

### "Table does not exist"
- รัน SQL ใน Supabase SQL Editor ยังไม่ครบ

### "permission denied for table documents"
- ใช้ key ผิด (anon vs service_role)
- ลองใช้ service_role key

### "function match_documents does not exist"
- SQL setup ไม่ครบ
- ตรวจสอบว่ารัน CREATE FUNCTION แล้ว

### Embedding dimension mismatch
- embedding model ใน config ต้องตรงกับ SQL (384)
- ถ้าใช้ model อื่น แก้ SQL เป็น vector(มิติที่ต้องการ)
