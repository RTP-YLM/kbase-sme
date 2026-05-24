#!/usr/bin/env python3
"""Test Supabase connection and required table/function."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from config import Config
from supabase import create_client

config = Config()
url = config.rag.get("supabase_url")
key = config.rag.get("supabase_key")
table = config.rag.get("supabase_table", "documents")

print("=== Supabase Config ===")
print(f"URL: {url}")
print(f"Key prefix: {key[:14]}..." if key else "Key: missing")
print(f"Table: {table}")

client = create_client(url, key)

print("\n=== Test table access ===")
try:
    result = client.table(table).select("id", count="exact").limit(1).execute()
    print(f"OK: table '{table}' accessible")
    print(f"Rows: {result.count}")
except Exception as e:
    print(f"ERROR: table access failed: {e}")
    print("Run supabase_setup.sql in Supabase SQL Editor first.")
    raise SystemExit(1)

print("\n=== Test RPC function ===")
try:
    dummy_embedding = [0.0] * 384
    result = client.rpc("match_documents", {
        "query_embedding": dummy_embedding,
        "match_count": 1,
        "filter_collection": "documents",
    }).execute()
    print("OK: match_documents RPC callable")
except Exception as e:
    print(f"ERROR: RPC failed: {e}")
    print("Run/verify match_documents() function in supabase_setup.sql.")
    raise SystemExit(1)

print("\nSupabase setup looks ready.")
