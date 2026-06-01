#!/usr/bin/env bash
# ออก Let's Encrypt cert สำหรับ production (ต้องมี domain + port 80 เปิด)
# ต้องติดตั้ง certbot ก่อน: apt install certbot

set -euo pipefail

DOMAIN="${1:?Usage: $0 <domain> <email>}"
EMAIL="${2:?Usage: $0 <domain> <email>}"
CERT_DIR="$(cd "$(dirname "$0")/../.." && pwd)/certs"

echo "→ ขอ cert จาก Let's Encrypt สำหรับ: $DOMAIN"

# หยุด nginx ชั่วคราว (standalone mode ต้องการ port 80)
docker compose stop nginx 2>/dev/null || true

certbot certonly --standalone \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --domains "$DOMAIN"

# copy cert ไปที่ certs/
mkdir -p "$CERT_DIR"
cp /etc/letsencrypt/live/"$DOMAIN"/fullchain.pem "$CERT_DIR/fullchain.pem"
cp /etc/letsencrypt/live/"$DOMAIN"/privkey.pem   "$CERT_DIR/privkey.pem"
chmod 600 "$CERT_DIR/privkey.pem"

# เริ่ม nginx ใหม่
docker compose start nginx 2>/dev/null || true

echo "✓ cert ติดตั้งแล้ว — หมดอายุ 90 วัน"
echo "  ตั้ง cron ต่ออายุ: 0 0 * * * /path/to/setup_certs_prod.sh $DOMAIN $EMAIL"
