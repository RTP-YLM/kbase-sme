#!/usr/bin/env python3
"""Debug Supabase retrieval and raw RPC results."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from config import Config
from supabase import create_client
from sentence_transformers import SentenceTransformer

config = Config()
client = create_client(config.rag["supabase_url"], config.rag["supabase_key"])
model = SentenceTransformer(config.rag.get("embedding_model"))

question = "พนักงานลากิจได้กี่วัน"
embedding = model.encode(question).tolist()
collection = "documents"

print("=== Count ===")
count_result = client.table("documents").select("id", count="exact").eq("collection", collection).execute()
print("Rows in collection:", count_result.count)

print("\n=== Sample Rows ===")
sample = client.table("documents").select("id, content, collection, metadata").eq("collection", collection).limit(3).execute()
for row in sample.data or []:
    print("ID:", row["id"])
    print("Collection:", row["collection"])
    print("Content:", row["content"][:120].replace("\n", " "))
    print("Metadata:", row["metadata"])

print("\n=== Raw RPC ===")
rpc = client.rpc("match_documents", {
    "query_embedding": embedding,
    "match_count": 5,
    "filter_collection": collection,
}).execute()
print("RPC rows:", len(rpc.data or []))
for row in rpc.data or []:
    print("ID:", row.get("id"))
    print("Similarity from SQL:", row.get("similarity"))
    print("Code currently converts to:", 1 - row.get("similarity", 0))
    print("Content:", row.get("content", "")[:120].replace("\n", " "))
