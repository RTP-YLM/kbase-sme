#!/usr/bin/env python3
"""Debug config and embedding"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from config import Config

config = Config()

print("=== Config ===")
print(f"Embedding model: {config.rag.get('embedding_model')}")
print(f"Similarity threshold: {config.rag.get('similarity_threshold')}")
print(f"Chunk size: {config.rag.get('chunk_size')}")

print("\n=== Raw RAG config ===")
print(config.rag)
