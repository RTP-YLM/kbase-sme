#!/usr/bin/env python3
"""Debug vector store"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from config import Config
from sentence_transformers import SentenceTransformer
from chromadb import PersistentClient

config = Config()

# Initialize embedding
print("Loading embedding model...")
embeddings = SentenceTransformer(config.rag.get("embedding_model", "all-MiniLM-L6-v2"))

# Connect to Chroma
persist_dir = config.rag.get("persist_directory", "./data/vectorstore")
print(f"Connecting to Chroma: {persist_dir}")
client = PersistentClient(path=persist_dir)

# List collections
print("\n=== Collections ===")
for col in client.list_collections():
    print(f"  - {col.name}")
    
    # Get collection
    collection = client.get_collection(col.name)
    count = collection.count()
    print(f"    Documents: {count}")
    
    if count > 0:
        # Get first few docs
        results = collection.get(limit=3)
        print(f"    Sample documents:")
        for i, doc in enumerate(results['documents']):
            print(f"      [{i+1}] {doc[:80]}...")

# Test embedding
print("\n=== Test Embedding ===")
test_text = "พนักงานลากิจได้ 3 วัน"
emb = embeddings.encode(test_text).tolist()
print(f"Text: {test_text}")
print(f"Embedding dim: {len(emb)}")

# Test search
print("\n=== Test Search ===")
query = "ลากิจ"
query_emb = embeddings.encode(query).tolist()

collection = client.get_collection(name="documents")
results = collection.query(query_embeddings=[query_emb], n_results=5)

print(f"Query: {query}")
print(f"Found: {len(results['documents'][0])} results")

for i, (doc, dist) in enumerate(zip(results['documents'][0], results['distances'][0])):
    similarity = 1 / (1 + dist)
    print(f"\n  [{i+1}] Distance: {dist:.4f} | Similarity: {similarity:.4f}")
    print(f"      {doc[:100]}...")
