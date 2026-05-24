#!/usr/bin/env python3
"""
Test script for RAG Engine
Run this to verify setup is working
"""
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from config import Config
from llm_provider import get_llm_provider
from rag_engine import RAGEngine


def test_llm():
    """Test LLM connection"""
    print("=" * 50)
    print("Testing LLM Connection...")
    print("=" * 50)
    
    config = Config()
    llm_config = config.llm
    
    print(f"Provider: {llm_config.get('provider')}")
    print(f"Model: {llm_config.get('model')}")
    print(f"Base URL: {llm_config.get('base_url')}")
    print()
    
    llm = get_llm_provider(llm_config.get("provider"), llm_config)
    
    try:
        response = llm.generate("Say hello in one sentence")
        print(f"✓ LLM Response: {response}")
        return True
    except Exception as e:
        print(f"✗ LLM Error: {e}")
        return False


def test_rag():
    """Test RAG engine"""
    print()
    print("=" * 50)
    print("Testing RAG Engine...")
    print("=" * 50)
    
    engine = RAGEngine()
    
    # Add test documents
    print("Adding test documents...")
    test_docs = [
        {"text": "Company policy: Employees get 15 days of paid leave per year.", "metadata": {"source": "HR Policy"}},
        {"text": "Expense reports must be submitted within 30 days of purchase.", "metadata": {"source": "Finance Policy"}},
        {"text": "Office hours are 9:00 AM to 6:00 PM, Monday to Friday.", "metadata": {"source": "Operations"}},
    ]
    
    engine.add_documents(test_docs, collection_name="test_collection")
    
    # Query
    print("Querying...")
    result = engine.query("How many days of paid leave do employees get?")
    
    print(f"✓ Answer: {result['answer']}")
    print(f"✓ Query time: {result['query_time']:.2f}s")
    print(f"✓ Sources: {len(result['sources'])}")
    
    # Show sources
    for i, source in enumerate(result['sources']):
        print(f"  Source {i+1}: {source['text'][:50]}...")
    
    return True


def main():
    print("RAG Side Project - Setup Test")
    print()
    
    # Test LLM
    llm_ok = test_llm()
    
    # Test RAG
    rag_ok = test_rag()
    
    print()
    print("=" * 50)
    print("Summary:")
    print(f"  LLM: {'✓ OK' if llm_ok else '✗ FAILED'}")
    print(f"  RAG: {'✓ OK' if rag_ok else '✗ FAILED'}")
    print("=" * 50)
    
    if llm_ok and rag_ok:
        print("\n✓ Setup complete! Ready to build the app.")
        return 0
    else:
        print("\n✗ Some tests failed. Check config and dependencies.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
