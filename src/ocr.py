"""
OCR — E2-3 Typhoon OCR สำหรับ PDF สแกนและรูปภาพ
ใช้ Typhoon Vision API (opentyphoon.ai) ผ่าน OpenAI-compatible endpoint
"""
import base64
import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

TYPHOON_OCR_BASE_URL = "https://api.opentyphoon.ai/v1"
TYPHOON_OCR_MODEL = "typhoon-ocr-preview"

# PDF ที่มีข้อความ < MIN_CHARS_PER_PAGE ต่อหน้าถือว่าเป็น scanned PDF
MIN_CHARS_PER_PAGE = 50


class TyphoonOCR:
    """OCR สำหรับ PDF สแกนและรูปภาพ ผ่าน Typhoon Vision API"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("TYPHOON_OCR_API_KEY") or ""
        if not self.api_key:
            raise RuntimeError(
                "TYPHOON_OCR_API_KEY ไม่ได้ตั้งค่า — ใส่ใน .env หรือ environment variable"
            )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def pdf_to_texts(self, file_path: Path) -> tuple[list[str], int]:
        """
        แปลง PDF (สแกน) เป็น text ทีละหน้า
        Returns: (list[page_text], page_count)
        """
        import fitz  # pymupdf

        doc = fitz.open(str(file_path))
        page_count = len(doc)
        page_texts: list[str] = []

        for page_num in range(page_count):
            page = doc[page_num]
            # 150 DPI — balance between quality และ API cost
            mat = fitz.Matrix(150 / 72, 150 / 72)
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            img_b64 = base64.b64encode(img_bytes).decode()

            text = self._ocr_image(img_b64, page_num=page_num + 1, total=page_count)
            page_texts.append(text)

        doc.close()
        return page_texts, page_count

    def image_to_text(self, file_path: Path) -> str:
        """แปลงรูปภาพ (.png/.jpg/.jpeg/.webp) เป็น text"""
        suffix = file_path.suffix.lower().lstrip(".")
        mime = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
        }.get(suffix, "image/png")

        with open(file_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode()

        return self._ocr_image(img_b64, page_num=None, total=1, mime=mime)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _ocr_image(
        self,
        img_b64: str,
        page_num: Optional[int],
        total: int,
        mime: str = "image/png",
    ) -> str:
        import httpx

        label = f"หน้า {page_num}/{total}" if page_num else "รูปภาพ"
        prompt = (
            f"อ่านและแปลงข้อความทั้งหมดใน{label}นี้เป็น text ตามที่ปรากฏ "
            "รักษาโครงสร้างและการจัดรูปแบบ ถ้ามีตารางให้แปลงเป็น markdown table "
            "ตอบเป็นข้อความตรงๆ ไม่ต้องมีคำอธิบายเพิ่มเติม"
        )

        payload = {
            "model": TYPHOON_OCR_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{img_b64}"},
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
            "max_tokens": 4096,
        }

        with httpx.Client(timeout=90.0) as client:
            resp = client.post(
                f"{TYPHOON_OCR_BASE_URL}/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            resp.raise_for_status()

        text = resp.json()["choices"][0]["message"]["content"]
        logger.info(f"OCR {label}: {len(text)} chars")
        return text


# ------------------------------------------------------------------
# Helper: ตรวจสอบว่า PDF ต้องการ OCR หรือไม่
# ------------------------------------------------------------------

def is_scanned_pdf(file_path: Path) -> bool:
    """
    คืน True ถ้า PDF เป็น scanned (text density ต่ำกว่า MIN_CHARS_PER_PAGE)
    ใช้ก่อน OCR เพื่อไม่ต้อง OCR PDF ที่มี text อยู่แล้ว
    """
    try:
        from pypdf import PdfReader

        reader = PdfReader(file_path)
        if not reader.pages:
            return True

        total_chars = sum(
            len((page.extract_text() or "").strip())
            for page in reader.pages
        )
        avg = total_chars / len(reader.pages)
        result = avg < MIN_CHARS_PER_PAGE
        if result:
            logger.info(
                f"{file_path.name}: avg {avg:.0f} chars/page → ใช้ OCR"
            )
        return result
    except Exception:
        return True  # ถ้าอ่านไม่ได้ → ลอง OCR
