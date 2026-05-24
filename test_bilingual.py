#!/usr/bin/env python3
"""Test with English to verify system works"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from sentence_transformers import SentenceTransformer
from chromadb import PersistentClient

print("Using embedding model: paraphrase-multilingual-MiniLM-L12-v2")
embeddings = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

client = PersistentClient(path="./data/vectorstore")
collection = client.get_collection(name="documents")

# Test with English query
query = "annual leave policy"
query_emb = embeddings.encode(query).tolist()

results = collection.query(query_embeddings=[query_emb], n_results=5)

print(f"\nQuery: {query}")
print(f"Results: {len(results['documents'][0])}")

for i, (doc, dist) in enumerate(zip(results['documents'][0], results['distances'][0])):
    similarity = 1 / (1 + dist)
    print(f"\n[{i+1}] Distance: {dist:.4f} | Similarity: {similarity:.4f}")
    print(f"    {doc[:100]}...")

# Also test Thai
query_thai = "ลากิจ"
query_emb_thai = embeddings.encode(query_thai).tolist()

results_thai = collection.query(query_embeddings=[query_emb_thai], n_results=5)

print(f"\n\n=== Thai Query ===")
print(f"Query: {query_thai}")
print(f"Results: {len(results_thai['documents'][0])}")

for i, (doc, dist) in enumerate(zip(results_thai['documents'][0], results_thai['distances'][0])):
    similarity = 1 / (1 + dist)
    print(f"\n[{i+1}] Distance: {dist:.4f} | Similarity: {similarity:.4f}")
    print(f"    {doc[:100]}...")
