# Production-Grade Hybrid RAG Platform Architecture
> **SME Internal Knowledge Base AI Assistant**
> เอกสารสถาปัตยกรรมระบบขั้นสูง ออกแบบมาเพื่อรองรับการเติบโตแบบ Mass-Market ทั้งรูปแบบคลาวด์สาธารณะ (Multi-tenant SaaS) และการติดตั้งในคลาวด์ส่วนตัว/เซิร์ฟเวอร์สำนักงาน (Single-tenant Private Cloud / On-Premise)

---

## 1. ภาพรวมสถาปัตยกรรมระดับระบบ (System Architecture Overview)

แพลตฟอร์มนี้ใช้วิธี **"Core API + Adaptable Plugs"** เพื่อให้ซอฟต์แวร์ชุดเดียวกัน (Single Codebase) สามารถแยกตัวไปรันในสภาพแวดล้อมต่าง ๆ ได้อย่างไร้รอยต่อ

```mermaid
graph TB
    %% --- Client Access Layer ---
    subgraph Clients ["Client Access Layer (ช่องทางการใช้งาน)"]
        LC[LINE OA Client / Webhooks]
        WC[Web Chat Application UI]
        AC[Admin Web Dashboard Portal]
    end

    %% --- SaaS Cloud Infrastructure ---
    subgraph SaaSCloud ["Model A: SaaS Multi-Tenant Cloud (GCP/AWS)"]
        CDN[Global CDN & DNS Routing]
        GW[API Gateway & Rate Limiter]
        
        %% API microservices
        subgraph SaaS_APIs ["Autoscale Microservices (FastAPI)"]
            AuthS[Auth & Tenant Service]
            IngestS[Document Ingestion Service]
            QueryS[Hybrid RAG Query Service]
            LineS[LINE Bot Adapter Service]
        end
        
        %% Workers
        subgraph Workers ["Async Workers (Celery & Redis)"]
            CelW[Ingestion Workers]
            Red[Redis Queue / Semantic Cache]
        end
        
        %% Shared Data Store
        subgraph SharedStores ["Shared Data Layer"]
            S3[(Object Storage: Raw PDFs/Docs)]
            SDB[(Supabase PostgreSQL + pgvector Cluster)]
        end
        
        %% Cloud LLM
        subgraph CloudLLMs ["External LLM Providers"]
            OpenAI[OpenAI API / GPT-4o-mini]
            QwenAPI[Alibaba DashScope / Qwen-Plus]
        end
    end

    %% --- Private Cloud / On-Premise Infrastructure ---
    subgraph PrivateCloud ["Model B: Private Cloud / On-Premise (Docker Stack)"]
        subgraph LocalDocker ["Isolated Dedicated VM (Docker Compose)"]
            Proxy[Nginx Reverse Proxy / Basic Auth]
            LAPI[Single-Tenant RAG Backend Container]
            LDB[(Local PostgreSQL + pgvector Container)]
            LStore[(Local Directory Storage)]
            OLL[Ollama / vLLM Container with GPU Pass-Through]
        end
    end

    %% --- Links Client to SaaS ---
    LC -->|HTTPS| CDN
    WC -->|HTTPS| CDN
    AC -->|HTTPS| CDN
    CDN --> GW
    GW --> AuthS
    GW --> IngestS
    GW --> QueryS
    GW --> LineS
    
    %% --- SaaS Internal Flows ---
    IngestS -->|Push Ingestion Task| Red
    Red -->|Pick Job| CelW
    CelW -->|Extract & OCR| S3
    CelW -->|Store Embeddings| SDB
    QueryS -->|Check Cache / Query Vectors| SDB
    QueryS -->|Generate Answers| QwenAPI
    QueryS -->|Generate Answers| OpenAI

    %% --- Links Client to Private ---
    LC -.->|VPC Peering / Local IP| Proxy
    WC -.->|Local Network / LAN| Proxy
    AC -.->|Local Network / LAN| Proxy
    
    %% --- Private Internal Flows ---
    Proxy --> LAPI
    LAPI -->|Verify & Store Docs| LStore
    LAPI -->|Index Vectors| LDB
    LAPI -->|Query Local LLM| OLL
    OLL -->|GPU Load Qwen-7B| LAPI

    classDef saas fill:#e6f3ff,stroke:#0066cc,stroke-width:1px;
    classDef private fill:#ffebeb,stroke:#cc0000,stroke-width:1px;
    classDef client fill:#f9f9f9,stroke:#333,stroke-width:1px;
    
    class SaaSCloud,SaaS_APIs,Workers,SharedStores,CloudLLMs saas;
    class PrivateCloud,LocalDocker private;
    class Clients client;
```

---

## 2. ขั้นตอนการนำเข้าข้อมูล (Ingestion Pipeline Sequence Diagram)

เมื่อผู้ใช้ทำการอัปโหลดเอกสาร (เช่น คู่มือพนักงาน .pdf หรือ SOP .docx) การประมวลผลจะเป็นแบบอซิงโครนัส (Asynchronous) เพื่อป้องกันปัญหาหน้าจอค้างในกรณีที่ไฟล์มีขนาดใหญ่

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin User
    participant Web as Web Dashboard
    participant API as Ingestion Service
    participant Redis as Redis Queue (Celery)
    participant Worker as Ingestion Worker
    participant DB as PostgreSQL (pgvector)
    
    Admin->>Web: อัปโหลดเอกสารนโยบายบริษัท (PDF/Docx)
    Web->>API: POST /api/v1/documents (Multipart File Upload)
    Note over API: ตรวจสอบความถูกต้องและสร้าง SHA256 Checksum
    API->>DB: ตรวจสอบค่า Checksum ซ้ำในตาราง `knowledge_sources`
    alt มีเอกสารเดียวกันในระบบและไม่เปลี่ยนแปลง
        DB-->>API: สัญญาณ: ข้อมูลไม่เปลี่ยนแปลง (Checksum Match)
        API-->>Web: ตอบกลับ: "สคริปต์สคิป (Skip Ingestion) เนื่องจากไฟล์เหมือนเดิม"
    else เป็นไฟล์ใหม่ หรือไฟล์ถูกแก้ไข
        DB-->>API: ไม่มี Checksum นี้ หรือไฟล์เปลี่ยน
        API->>DB: บันทึกข้อมูลตั้งต้นใน `knowledge_sources` (สถานะ: Ingesting)
        API->>Redis: ส่งคำสั่งงานเข้าระบบ (Queue Ingestion Task)
        API-->>Web: ตอบกลับ: "เริ่มนำเข้าข้อมูลแล้ว (Job ID: XXX)"
        Note over Worker: ดึงงานจากคิวไปเริ่มทำเบื้องหลัง (Background Worker)
        Worker->>Worker: อ่านโครงสร้างเอกสาร (Text/Markdown Parser)
        Note over Worker: ตรวจสอบเงื่อนไข PDF สแกนเพื่อเรียกใช้ OCR
        Worker->>Worker: แบ่งย่อยข้อความด้วยตัวตัดคำภาษาไทย (Thai Segmenter)
        Worker->>Worker: สร้างเวกเตอร์ (Embeddings Generator)
        Worker->>DB: บันทึกข้อมูลลง `knowledge_chunks` พร้อม `source_id` และ `embedding`
        Worker->>DB: อัปเดตสถานะใน `knowledge_sources` เป็น (สถานะ: Active)
    end
```

---

## 3. ขั้นตอนการถามตอบและการจัดอันดับใหม่ (RAG Query & Reranking Sequence)

เมื่อพนักงานส่งคำถามเข้ามาทางหน้าเว็บแชท หรือทาง LINE OA ระบบจะทำการวิเคราะห์ค้นหาอย่างละเอียดโดยใช้สถาปัตยกรรมแบบ **Hybrid Search** และ **Reranker** เพื่อยืนยันว่าข้อมูลตอบกลับจะแม่นยำที่สุด

```mermaid
sequenceDiagram
    autonumber
    actor User as Employee (Web / LINE)
    participant API as Query Service (FastAPI)
    participant Cache as Redis (Semantic Cache)
    participant DB as PostgreSQL (pgvector)
    participant Rerank as Reranker Model (Local/API)
    participant LLM as LLM Engine (Ollama/Cloud)

    User->>API: ถามคำถาม: "ลากิจต้องแจ้งล่วงหน้ากี่วัน"
    API->>Cache: ตรวจสอบคำถามที่คล้ายกันใน Cache (Semantic Cache Check)
    alt ค้นพบคำตอบในระบบแคชและคะแนนความเหมือนสูง
        Cache-->>API: ส่งคืนคำตอบที่เคยบันทึกไว้ทันที (Cache Hit)
        API-->>User: ตอบกลับพนักงานอย่างรวดเร็ว (Latency < 100ms)
    else ไม่พบคู่คำถามในแคช (Cache Miss)
        API->>API: แปลงคำถามของพนักงานเป็น Embedding Vector
        
        %% Hybrid Search Start
        Note over API, DB: เริ่มการค้นหาแบบคู่ขนาน (Hybrid Search)
        API->>DB: 1. Vector Search (ค้นหาความหมายผ่าน cosine distance ใน pgvector)
        API->>DB: 2. Keyword Search (ค้นหาคำเฉพาะผ่าน Full-Text Search)
        DB-->>API: ส่งกลับรายการ Chunk เอกสารที่มีความน่าจะเป็นสูง (Top 20 Chunks)
        
        %% Reranking Process
        Note over API, Rerank: ส่ง Chunk ข้อมูลและคำถามไปจัดเรียงลำดับใหม่
        API->>Rerank: ส่งข้อมูล (Question + 20 Chunks)
        Note over Rerank: ประเมินความสัมพันธ์อย่างละเอียดด้วย Cross-Encoder
        Rerank-->>API: คืนค่าเฉพาะ Top 3-5 Chunks ที่มีคะแนนสูงสุด
        
        %% Prompt & generation
        API->>API: ประกอบข้อมูลเข้ากับ Prompt Template (System Context)
        API->>LLM: ส่งข้อมูล Prompt ไปให้โมเดลตอบคำถาม (Ollama / Cloud Provider)
        LLM-->>API: ตอบกลับเป็นผลลัพธ์คำตอบ
        API->>Cache: บันทึกคำถามและคำตอบลง Semantic Cache เพื่อประหยัด Token ในครั้งถัดไป
        API-->>User: ตอบกลับพร้อมแสดงแหล่งอ้างอิงเอกสารและคะแนนความมั่นใจ
    end
```

---

## 4. โครงสร้างความปลอดภัยและการแบ่งแยกข้อมูลลูกค้า (Multi-Tenant Security Isolation)

สำหรับระบบ SaaS ส่วนกลางที่ต้องจัดเก็บข้อมูลของลูกค้าหลายบริษัทรวมกัน จะต้องใช้ **Row Level Security (RLS)** ของ PostgreSQL ในระดับซอฟต์แวร์และฮาร์ดแวร์เพื่อไม่ให้ข้อมูลเกิดการรั่วไหลข้ามองค์กร

```sql
-- เปิดการใช้งาน RLS บนตารางข้อมูล
alter table knowledge_sources enable row level security;
alter table knowledge_chunks enable row level security;

-- นโยบาย RLS บังคับว่าผู้ใช้จะเห็นเฉพาะข้อมูลของ tenant_id ตัวเองที่ได้รับสิทธิ์เท่านั้น
create policy tenant_isolation_sources_policy on knowledge_sources
    for all
    using (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

create policy tenant_isolation_chunks_policy on knowledge_chunks
    for all
    using (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

> [!IMPORTANT]
> **ระบบสิทธิ์ใน Backend Application:**
> ทุกครั้งที่มีการติดต่อเข้าฐานข้อมูลในรูปแบบ Multi-Tenant ระบบ FastAPI Router จะทำการดึง `tenant_id` ออกจาก JSON Web Token (JWT) ของผู้นั้น และนำไปทำธุรกรรมใน SQL โดยใช้ `SET LOCAL app.current_tenant_id = '...'` ก่อนรันคำสั่ง Query เสมอ เพื่อการันตีความปลอดภัยสูงสุด

---

## 5. การวิเคราะห์เปรียบเทียบสถาปัตยกรรมสำหรับฝั่งขาย Mass

| ประเด็นการวิเคราะห์ | รูปแบบคลาวด์ร่วม (SaaS Multi-Tenant) | รูปแบบส่วนตัว (Private Cloud / On-Premise) |
| :--- | :--- | :--- |
| **กลุ่มลูกค้าเป้าหมาย** | แผนเริ่มต้น (Starter) และ แผนเติบโต (Growth) | แผนองค์กรระดับธุรกิจ (Business / Enterprise) |
| **การจัดการข้อมูล** | ข้อมูลถูกเก็บในคลาวด์ศูนย์กลาง แยกตามสิทธิ์ RLS | ข้อมูลถูกเก็บอยู่ในเน็ตเวิร์กภายในบริษัท 100% |
| **ค่าบำรุงรักษารายเดือน** | ต่ำ (เนื่องจากแชร์โครงสร้างพื้นฐานเซิร์ฟเวอร์ร่วมกัน) | ปานกลางถึงสูง (ตามรอบการเช่า GPU หรือค่าดูแล SLA) |
| **โมเดล LLM หลัก** | Cloud API (จ่ายเงินตามการโทรใช้งานจริง) | Local LLM (ผ่าน Ollama / vLLM บน GPU การ์ดจอส่วนตัว) |
| **ความสะดวกในการอัปเดต** | อัปเดตพร้อมกันได้ในปุ่มเดียวจากส่วนกลาง | ต้องส่งชุดคำสั่ง Docker Compose ไปอัปเกรดแบบรายจุด |
| **ความซับซ้อนการติดตั้ง** | ไม่มี (คลิกสมัครใช้งานผ่านเว็บได้ทันที) | ปานกลาง (ต้องการการตั้งค่าเครื่องคอมพิวเตอร์และไดรเวอร์การ์ดจอ) |
