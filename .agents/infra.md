# Infra Agent — DEVOPS (E7 + E9)

> **บทบาท:** Docker Compose, nginx, TLS, security hardening, monitoring, on-prem deploy
> **Issues:** E7 (#28–#31), E9 (#35–#38)
> **Goal:** `docker compose up` ครั้งเดียว ได้ stack ที่พร้อม production

---

## E9-1 — Docker Compose Stack

### Services ที่ต้องมีครบ

```yaml
# docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on: [rag-api, web]

  rag-api:
    build: ./api
    env_file: .env
    depends_on: [postgres, redis]
    # ห้าม expose port ตรง — ผ่าน nginx เท่านั้น

  ingest-worker:
    build: ./api
    command: celery -A app.worker worker
    env_file: .env
    depends_on: [postgres, redis]

  web:
    build: ./web
    # Next.js static export หรือ standalone

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes: [redis-data:/data]

  postgres:
    image: pgvector/pgvector:pg16
    env_file: .env
    volumes: [pg-data:/var/lib/postgresql/data]
    # ห้าม expose port 5432 ออก host ใน production

volumes:
  pg-data:
  redis-data:
```

### Health Check ทุก service

```yaml
# rag-api
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

---

## E7-2 — nginx + TLS

```nginx
# nginx/nginx.conf
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # API
    location /api/ {
        proxy_pass http://rag-api:8000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # LINE webhook timeout ต้องยาวพอ
        proxy_read_timeout 60s;
    }

    # Frontend
    location / {
        proxy_pass http://web:3000;
    }

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000" always;
}
```

**TLS cert options:**
- Hosted (VPS): Let's Encrypt + certbot auto-renew
- On-prem: self-signed cert (generate script อยู่ใน `scripts/gen-cert.sh`)

---

## E7-1 — Secret Management

```bash
# .env.example — commit ได้
# .env — gitignore เสมอ
DATABASE_URL=postgresql://user:pass@postgres:5432/kbase
REDIS_URL=redis://redis:6379
JWT_SECRET=              # openssl rand -hex 32
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
OPENAI_API_KEY=          # หรือ GEMINI_API_KEY
BGE_MODEL_PATH=./models/bge-m3
TENANT_ID=1

# กฎ:
# - ห้าม hardcode key ใน code
# - ห้าม log .env values
# - ห้าม expose DB port ออก host ใน production
```

---

## E9-2 — On-Prem Profile (Ollama + Typhoon 2)

```yaml
# docker-compose.onprem.yml (extends base)
services:
  ollama:
    image: ollama/ollama
    runtime: nvidia  # GPU passthrough
    volumes:
      - ollama-models:/root/.ollama
    environment:
      - NVIDIA_VISIBLE_DEVICES=all

  # rag-api ชี้ไปที่ ollama แทน cloud LLM
  rag-api:
    environment:
      LLM_PROVIDER: ollama
      OLLAMA_BASE_URL: http://ollama:11434
      OLLAMA_MODEL: typhoon2
```

**Run on-prem:**
```bash
docker compose -f docker-compose.yml -f docker-compose.onprem.yml up
# pull model ครั้งแรก:
docker exec ollama ollama pull typhoon2
```

---

## E9-3 — Backup + Monitoring

### Backup
```bash
# scripts/backup.sh — รัน daily via cron
pg_dump $DATABASE_URL | gzip > backup/kbase_$(date +%Y%m%d).sql.gz
# เก็บ 30 วัน → ลบอัตโนมัติ
find backup/ -name "*.sql.gz" -mtime +30 -delete
# copy ไป remote storage (S3/R2/rclone)
```

### Monitoring (Metrics พื้นฐาน)
```python
# ใน /health endpoint:
{
  "status": "ok",
  "db": "connected",
  "redis": "connected",
  "worker_queue_depth": 3,
  "last_query_at": "2026-05-31T14:00:00Z",
  "version": "1.0.0"
}
```

### Cost + Latency Logging
- log ทุก LLM call: model, input_tokens, output_tokens, latency_ms, tenant_id
- aggregate daily ต่อ tenant → ใช้คำนวณ margin จริง
- alert ถ้า daily cost เกิน threshold (email/LINE notify)

---

## E9-4 — Demo Environment

**เป้า:** URL + LINE demo ที่แสดงให้ลูกค้าดูได้ทันที

```
demo.kbasesme.com
├── เอกสารตัวอย่าง: HR Policy, Price List, SOP (dummy data)
├── LINE OA demo: @kbase-demo
├── Admin UI: demo-admin / demo123
└── Web Chat: ไม่ต้อง login
```

**กฎ demo env:**
- ข้อมูลใน demo ต้องเป็น dummy ทั้งหมด — ห้ามใช้ข้อมูลลูกค้าจริง
- reset ข้อมูล query logs ทุกสัปดาห์
- ใช้ instance เล็กสุด (ประหยัด cost)

---

## Deploy Checklist (ก่อน go-live)

- [ ] TLS cert ใช้งานได้, auto-renew ตั้งค่าแล้ว
- [ ] ไม่มี DB port expose ออก host
- [ ] .env ไม่อยู่ใน git
- [ ] Health check ทุก service ผ่าน
- [ ] Backup script ทดสอบ restore ได้
- [ ] nginx rate limiting ตั้งค่า (10 req/s per IP)
- [ ] Log rotation ตั้งค่าแล้ว
- [ ] Firewall: เปิดแค่ 80, 443

---

## Scripts ที่ต้องมี

```
scripts/
├── gen-cert.sh        # self-signed cert สำหรับ on-prem
├── backup.sh          # backup + rotate
├── restore.sh         # restore จาก backup
├── update.sh          # pull + rebuild + rolling restart
└── health-check.sh    # ตรวจ stack ทั้งหมด
```
