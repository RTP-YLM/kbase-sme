#!/usr/bin/env bash
# สร้าง self-signed TLS cert สำหรับ local dev / demo
# Production: ใช้ setup_certs_prod.sh (Let's Encrypt) แทน

set -euo pipefail

CERT_DIR="$(cd "$(dirname "$0")/../.." && pwd)/certs"
DAYS=365
DOMAIN="${1:-localhost}"

mkdir -p "$CERT_DIR"

echo "→ สร้าง self-signed cert สำหรับ: $DOMAIN"
echo "   output: $CERT_DIR/"

openssl req -x509 -nodes -days "$DAYS" \
  -newkey rsa:2048 \
  -keyout "$CERT_DIR/privkey.pem" \
  -out    "$CERT_DIR/fullchain.pem" \
  -subj   "/C=TH/ST=Bangkok/O=KbaseSME/CN=$DOMAIN" \
  -addext "subjectAltName=DNS:$DOMAIN,DNS:localhost,IP:127.0.0.1"

chmod 600 "$CERT_DIR/privkey.pem"
chmod 644 "$CERT_DIR/fullchain.pem"

echo "✓ cert พร้อมแล้ว (self-signed, หมดอายุ $DAYS วัน)"
echo "  Browser จะแจ้ง 'not trusted' — กด Advanced → Proceed to proceed"
