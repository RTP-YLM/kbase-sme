#!/usr/bin/env python3
"""Quick test with consistent embedding model"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from sentence_transformers import SentenceTransformer
from chromadb import PersistentClient

print("Using embedding model: paraphrase-multilingual-MiniLM-L12-v2")
embeddings = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

client = PersistentClient(path="./data/vectorstore")
collection = client.get_collection(name="documents")

print(f"Documents in collection: {collection.count()}")

# Test query
query = "ลากิจ"
query_emb = embeddings.encode(query).tolist()

results = collection.query(query_embeddings=[query_emb], n_results=5)

print(f"\nQuery: {query}")
print(f"Results: {len(results['documents'][0])}")

for i, (doc, dist) in enumerate(zip(results['documents'][0], results['distances'][0])):
    similarity = 1 / (1 + dist)
    print(f"\n[{i+1}] Distance: {dist:.4f} | Similarity: {similarity:.4f}")
    print(f"    {doc[:120]}...")
