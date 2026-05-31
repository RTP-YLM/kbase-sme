#!/usr/bin/env python3
"""
Ingest documents into the RAG system
Usage: python ingest.py [directory] [--reset] [--collection COLLECTION_NAME]
"""
import sys
import argparse
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from config import Config
from document_loader import DocumentLoader
from rag_engine import RAGEngine


def ingest(directory: str = "data/documents", collection_name: str = "documents", reset: bool = False):
    """Ingest all documents from directory into vector store"""
    
    print("=" * 60)
    print("RAG Document Ingestion")
    print("=" * 60)
    
    # Load config
    config = Config()
    
    # Initialize components
    loader = DocumentLoader(
        chunk_size=config.rag.get("chunk_size", 512),
        chunk_overlap=config.rag.get("chunk_overlap", 50),
    )
    
    engine = RAGEngine(config)
    engine.initialize()
    
    # Reset collection if requested
    if reset:
        print(f"\nResetting collection '{collection_name}'...")
        try:
            engine.delete_collection(collection_name)
            print(f"✓ Collection '{collection_name}' reset completed (deleted all existing chunks).")
        except Exception as e:
            print(f"Error resetting collection: {e}")
            return 1
            
    # Load documents
    dir_path = Path(directory)
    if not dir_path.exists():
        print(f"Error: Directory not found: {directory}")
        return 1
    
    print(f"\nLoading documents from: {dir_path.absolute()}")
    documents = loader.load_directory(str(dir_path))
    
    if not documents:
        print("No documents found!")
        return 1
    
    print(f"Loaded {len(documents)} document chunks")
    
    # Add to vector store
    print(f"\nAdding to vector store (collection: {collection_name})...")
    engine.add_documents(documents, collection_name=collection_name)
    
    # Show stats
    stats = engine.get_collection_stats(collection_name)
    print(f"\n✓ Collection stats:")
    print(f"  - Documents: {stats['document_count']}")
    
    print("\n" + "=" * 60)
    print("Ingestion complete!")
    print("=" * 60)
    
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest documents into the RAG system")
    parser.add_argument("directory", nargs="?", default="data/documents", help="Directory containing documents (default: data/documents)")
    parser.add_argument("--reset", action="store_true", help="Delete all documents in the collection before ingestion")
    parser.add_argument("--collection", default="documents", help="Name of the collection to ingest into (default: documents)")
    
    args = parser.parse_args()
    sys.exit(ingest(args.directory, args.collection, args.reset))
