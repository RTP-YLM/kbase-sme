"""
Document Loader
Load and chunk documents from various file types
"""
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class DocumentLoader:
    """Load documents from files"""
    
    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def load_directory(self, directory: str, glob_pattern: str = "*") -> List[Dict[str, Any]]:
        """
        Load all documents from a directory
        
        Args:
            directory: Path to directory containing documents
            glob_pattern: Glob pattern to match files (e.g., "*.pdf", "*.txt")
        
        Returns:
            List of documents with 'text' and 'metadata'
        """
        dir_path = Path(directory)
        if not dir_path.exists():
            raise FileNotFoundError(f"Directory not found: {directory}")
        
        documents = []
        
        # Find all matching files
        files = list(dir_path.glob(glob_pattern))
        
        # Also search subdirectories
        for ext in ["*.pdf", "*.txt", "*.md", "*.docx"]:
            files.extend(dir_path.rglob(ext))
        
        # Remove duplicates
        files = list(set(files))
        
        logger.info(f"Found {len(files)} files in {directory}")
        
        for file_path in files:
            docs = self.load_file(file_path)
            documents.extend(docs)
        
        return documents
    
    def load_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """
        Load a single file and split into chunks
        
        Args:
            file_path: Path to the file
        
        Returns:
            List of document chunks
        """
        suffix = file_path.suffix.lower()
        
        loaders = {
            ".txt": self._load_text,
            ".md": self._load_text,
            ".pdf": self._load_pdf,
            ".docx": self._load_docx,
        }
        
        if suffix not in loaders:
            logger.warning(f"Unsupported file type: {suffix}")
            return []
        
        try:
            text = loaders[suffix](file_path)
            chunks = self._chunk_text(text, file_path)
            logger.info(f"Loaded {len(chunks)} chunks from {file_path.name}")
            return chunks
        except Exception as e:
            logger.error(f"Error loading {file_path}: {e}")
            return []
    
    def _load_text(self, file_path: Path) -> str:
        """Load plain text file"""
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    
    def _load_pdf(self, file_path: Path) -> str:
        """Load PDF file"""
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n\n"
            return text
        except ImportError:
            logger.warning("pypdf not installed. Install with: pip install pypdf")
            return ""
    
    def _load_docx(self, file_path: Path) -> str:
        """Load DOCX file"""
        try:
            from docx import Document
            doc = Document(file_path)
            text = ""
            for para in doc.paragraphs:
                text += para.text + "\n"
            return text
        except ImportError:
            logger.warning("python-docx not installed. Install with: pip install python-docx")
            return ""
    
    def _chunk_text(self, text: str, file_path: Path) -> List[Dict[str, Any]]:
        """
        Split text into overlapping chunks
        
        Args:
            text: Text to chunk
            file_path: Source file path for metadata
        
        Returns:
            List of chunk dicts
        """
        if not text.strip():
            return []
        
        chunks = []
        words = text.split()
        
        # If text is shorter than chunk_size, return as single chunk
        if len(words) <= self.chunk_size:
            chunks.append({
                "text": text.strip(),
                "metadata": {
                    "source": str(file_path),
                    "filename": file_path.name,
                    "chunk": 0,
                    "total_chunks": 1,
                }
            })
            return chunks
        
        # Create overlapping chunks
        step = self.chunk_size - self.chunk_overlap
        chunk_num = 0
        
        for i in range(0, len(words), step):
            chunk_words = words[i:i + self.chunk_size]
            chunk_text = " ".join(chunk_words)
            
            chunks.append({
                "text": chunk_text.strip(),
                "metadata": {
                    "source": str(file_path),
                    "filename": file_path.name,
                    "chunk": chunk_num,
                    "total_chunks": -1,  # Will be updated later
                }
            })
            chunk_num += 1
        
        # Update total_chunks
        for chunk in chunks:
            chunk["metadata"]["total_chunks"] = chunk_num
        
        return chunks
    
    def chunk_text_direct(self, text: str, metadata: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Chunk text directly without loading from file
        
        Args:
            text: Text to chunk
            metadata: Optional metadata dict
        
        Returns:
            List of chunk dicts
        """
        if metadata is None:
            metadata = {"source": "manual"}
        
        return self._chunk_text(text, Path("manual"))
