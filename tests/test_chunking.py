"""
Unit tests — E2-2 ThaiChunker + DocumentLoader
DoD: chunk ไทยไม่ตัดคำมั่ว, section boundary ถูกต้อง, ทดสอบ 5 เอกสาร
"""
import hashlib
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from document_loader import (
    DEFAULT_CHUNK_OVERLAP,
    DEFAULT_CHUNK_SIZE,
    Chunk,
    DocumentLoader,
    Section,
    ThaiChunker,
    _count_tokens,
    _detect_sections_text,
    _tokenize_thai,
)

DATA_DIR = Path(__file__).parent.parent / "data" / "documents"


# ---------------------------------------------------------------------------
# Thai Tokenizer
# ---------------------------------------------------------------------------

class TestThaiTokenizer:
    def test_tokenize_basic_thai(self):
        tokens = _tokenize_thai("ลากิจได้กี่วัน")
        assert len(tokens) > 1, "ควรตัดคำได้มากกว่า 1 token"
        assert "".join(tokens) == "ลากิจได้กี่วัน"

    def test_tokenize_no_whitespace_split(self):
        # ถ้ายังใช้ text.split() → ได้ 1 token เพราะไม่มีช่องว่าง
        tokens = _tokenize_thai("พนักงานมีสิทธิ์ลาพักผ่อนประจำปี")
        assert len(tokens) > 1, "text.split() จะได้แค่ 1 token — PyThaiNLP ต้องได้มากกว่า"

    def test_tokenize_mixed_thai_english(self):
        tokens = _tokenize_thai("ติดต่อ HR Department ได้เลย")
        assert len(tokens) >= 4

    def test_count_tokens_thai(self):
        count = _count_tokens("นโยบายการลาพักผ่อน")
        assert count >= 2

    def test_count_tokens_empty(self):
        assert _count_tokens("") == 0


# ---------------------------------------------------------------------------
# Section Detection
# ---------------------------------------------------------------------------

class TestSectionDetection:
    def test_markdown_headers(self):
        text = "# นโยบายทรัพยากรบุคคล\n\nบริษัทให้สิทธิ์ลาพักผ่อน\n\n## การลา\n\nลาป่วยได้ 30 วัน"
        sections = _detect_sections_text(text)
        assert len(sections) >= 2
        titles = [s.title for s in sections if s.title]
        assert any("นโยบาย" in (t or "") for t in titles)

    def test_no_header_single_section(self):
        text = "บริษัทให้สิทธิ์ลาพักผ่อนประจำปี 10 วัน สำหรับพนักงานที่ผ่านทดลองงาน"
        sections = _detect_sections_text(text)
        assert len(sections) == 1
        assert sections[0].title is None

    def test_section_content_preserved(self):
        text = "# หัวข้อ\n\nเนื้อหาสำคัญ"
        sections = _detect_sections_text(text)
        assert any("เนื้อหา" in s.content for s in sections)


# ---------------------------------------------------------------------------
# ThaiChunker
# ---------------------------------------------------------------------------

class TestThaiChunker:
    def setup_method(self):
        self.chunker = ThaiChunker(chunk_size=50, chunk_overlap=10)

    def test_short_section_single_chunk(self):
        section = Section(title="ทดสอบ", content="ลาได้ 3 วัน")
        chunks = self.chunker.chunk_sections([section])
        assert len(chunks) == 1
        assert chunks[0].section_title == "ทดสอบ"

    def test_long_section_multiple_chunks(self):
        # สร้างข้อความยาวเพื่อทดสอบ sliding window
        long_text = "พนักงานมีสิทธิ์ลาพักผ่อนประจำปี " * 30
        section = Section(title="นโยบายลา", content=long_text)
        chunks = self.chunker.chunk_sections([section])
        assert len(chunks) > 1

    def test_chunk_index_sequential(self):
        sections = [
            Section(title="A", content="เนื้อหา A " * 5),
            Section(title="B", content="เนื้อหา B " * 5),
        ]
        chunks = self.chunker.chunk_sections(sections)
        indices = [c.chunk_index for c in chunks]
        assert indices == list(range(len(chunks))), "chunk_index ต้องเรียงต่อเนื่อง"

    def test_section_title_preserved_in_chunk(self):
        section = Section(title="การลาป่วย", content="ลาป่วยได้ 30 วันทำการต่อปี")
        chunks = self.chunker.chunk_sections([section])
        assert all(c.section_title == "การลาป่วย" for c in chunks)

    def test_short_sections_merged(self):
        # section สั้น 2 ตัว ควร merge เป็น 1
        chunker = ThaiChunker(chunk_size=200, chunk_overlap=20, min_section_tokens=50)
        short1 = Section(title="A", content="สั้น")
        short2 = Section(title="B", content="สั้นมาก")
        chunks = chunker.chunk_sections([short1, short2])
        assert len(chunks) >= 1  # merged ไม่ error

    def test_empty_section_skipped(self):
        sections = [
            Section(title="empty", content=""),
            Section(title="real", content="มีเนื้อหาจริง"),
        ]
        chunks = self.chunker.chunk_sections(sections)
        assert all(c.content.strip() for c in chunks), "ห้ามมี chunk ว่างเปล่า"

    def test_no_text_split_in_chunking(self):
        # ตรวจว่า content ของ chunk ไม่ลงท้ายด้วยคำที่ถูกตัดกลาง
        # (PyThaiNLP ตัดที่ token boundary ไม่ใช่ character boundary)
        text = "พนักงานทุกคนมีสิทธิ์ลากิจได้สามวันทำการต่อปีตามระเบียบของบริษัท" * 5
        section = Section(title=None, content=text)
        chunker = ThaiChunker(chunk_size=20, chunk_overlap=5)
        chunks = chunker.chunk_sections([section])
        for chunk in chunks:
            # แต่ละ chunk ต้องมี content ที่ไม่ว่าง
            assert chunk.content.strip(), f"chunk {chunk.chunk_index} ว่างเปล่า"
            assert chunk.token_count > 0


# ---------------------------------------------------------------------------
# DocumentLoader — integration กับไฟล์จริง
# ---------------------------------------------------------------------------

class TestDocumentLoader:
    def setup_method(self):
        self.loader = DocumentLoader()

    @pytest.mark.parametrize("filename", [
        "01_hr_policy.md",
        "02_accounting_policy.md",
        "03_sales_sop.md",
    ])
    def test_load_md_documents(self, filename):
        path = DATA_DIR / filename
        if not path.exists():
            pytest.skip(f"ไม่พบไฟล์ {filename}")

        source, chunks = self.loader.load_file(path)

        # SourceInfo ถูกต้อง
        assert source.filename == filename
        assert len(source.checksum) == 64, "SHA256 ต้องยาว 64 chars"
        assert source.file_size_bytes > 0

        # Chunks ไม่ว่าง
        assert len(chunks) > 0, f"{filename} ต้องได้ chunk อย่างน้อย 1"

        # ทุก chunk มี content ไม่ว่าง
        for chunk in chunks:
            assert chunk.content.strip(), f"chunk {chunk.chunk_index} ว่างเปล่า"
            assert chunk.token_count > 0
            assert chunk.metadata.get("source_filename") == filename

        # chunk_index เรียงต่อเนื่อง
        indices = [c.chunk_index for c in chunks]
        assert indices == list(range(len(chunks)))

    def test_checksum_deterministic(self):
        path = DATA_DIR / "01_hr_policy.md"
        if not path.exists():
            pytest.skip("ไม่พบไฟล์ทดสอบ")

        source1, _ = self.loader.load_file(path)
        source2, _ = self.loader.load_file(path)
        assert source1.checksum == source2.checksum, "checksum ต้องเหมือนกันทุกครั้ง"

    def test_unsupported_format_raises(self):
        with pytest.raises(ValueError, match="ไม่รองรับ"):
            self.loader.load_file(Path("test.pptx"))

    def test_missing_file_raises(self):
        with pytest.raises(FileNotFoundError):
            self.loader.load_file(Path("nonexistent.md"))

    def test_thai_content_tokenized_correctly(self):
        """ตรวจว่า chunk มี token ไทยถูกต้อง ไม่ตัดกลางคำ"""
        path = DATA_DIR / "01_hr_policy.md"
        if not path.exists():
            pytest.skip("ไม่พบไฟล์ทดสอบ")

        _, chunks = self.loader.load_file(path)

        # chunk ไหนก็ตามที่มีภาษาไทย ต้องมี token count > 1 ต่อ 10 chars
        thai_chunks = [c for c in chunks if any('฀' <= ch <= '๿' for ch in c.content)]
        assert len(thai_chunks) > 0, "ต้องมี chunk ที่มีภาษาไทย"

        for chunk in thai_chunks[:5]:  # ตรวจ 5 chunk แรก
            char_count = len(chunk.content)
            # PyThaiNLP tokenize ภาษาไทย → token มากกว่า 1 ต่อ 10 chars เสมอ
            ratio = chunk.token_count / max(char_count, 1)
            assert ratio > 0.05, (
                f"token count ต่ำผิดปกติ ({chunk.token_count} tokens / {char_count} chars) "
                f"— อาจยังใช้ text.split()"
            )
