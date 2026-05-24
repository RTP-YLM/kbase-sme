#!/usr/bin/env python3
"""
Query the RAG system
Usage: python query.py [your question]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

from rag_engine import RAGEngine


def main():
    if len(sys.argv) < 2:
        print("Usage: python query.py [your question]")
        print("Example: python query.py 'พนักงานลากิจได้กี่วัน'")
        return 1
    
    question = " ".join(sys.argv[1:])
    
    print("=" * 60)
    print(f"Question: {question}")
    print("=" * 60)
    
    engine = RAGEngine()
    result = engine.query(question)
    
    print(f"\nAnswer: {result['answer']}")
    print(f"\nQuery time: {result['query_time']:.2f}s")
    print(f"Sources: {len(result['sources'])}")
    
    for i, source in enumerate(result['sources']):
        print(f"\n  [Source {i+1}] {source['metadata'].get('filename', 'unknown')}")
        print(f"  Similarity: {source['similarity']:.3f}")
        print(f"  Text: {source['text'][:150]}...")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
