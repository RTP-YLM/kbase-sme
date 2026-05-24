"""
Supabase Vector Store
Use Supabase with pgvector for RAG storage
"""
from typing import List, Dict, Any, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class SupabaseVectorStore:
    """Vector store using Supabase pgvector"""
    
    def __init__(self, supabase_url: str, supabase_key: str, table_name: str = "documents"):
        """
        Initialize Supabase vector store
        
        Args:
            supabase_url: Supabase project URL
            supabase_key: Supabase anon/service key
            table_name: Table name for storing embeddings
        """
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.table_name = table_name
        self.client = None
        self._initialized = False
    
    def initialize(self):
        """Initialize Supabase client"""
        if self._initialized:
            return
        
        try:
            from supabase import create_client, Client
            self.client: Client = create_client(self.supabase_url, self.supabase_key)
            self._initialized = True
            logger.info(f"Connected to Supabase: {self.supabase_url}")
        except ImportError:
            raise ImportError("supabase package not installed. Install with: pip install supabase")
        except Exception as e:
            logger.error(f"Failed to connect to Supabase: {e}")
            raise
    
    def create_table_if_not_exists(self, embedding_dim: int = 384):
        """
        Create the vector table if it doesn't exist
        
        Note: This requires running SQL in Supabase SQL Editor first.
        See setup instructions in README.
        """
        # For now, just verify table exists by querying
        try:
            result = self.client.table(self.table_name).select("id").limit(1).execute()
            logger.info(f"Table {self.table_name} exists")
        except Exception as e:
            logger.warning(f"Table {self.table_name} may not exist: {e}")
            logger.warning("Please run the setup SQL in Supabase SQL Editor (see README)")
            raise
    
    def add_documents(self, documents: List[Dict[str, Any]], collection_name: str = "default"):
        """
        Add documents to the vector store
        
        Args:
            documents: List of dicts with 'text', 'embedding', and 'metadata'
            collection_name: Collection/group name
        """
        if not self._initialized:
            self.initialize()
        
        if not documents:
            return
        
        # Prepare records for insertion
        records = []
        for doc in documents:
            record = {
                "content": doc.get("text", ""),
                "embedding": doc.get("embedding", []),
                "metadata": doc.get("metadata", {}),
                "collection": collection_name,
            }
            records.append(record)
        
        # Insert in batches
        batch_size = 100
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            result = self.client.table(self.table_name).insert(batch).execute()
            logger.info(f"Inserted {len(batch)} documents into Supabase")
    
    def search(self, query_embedding: List[float], collection_name: str = "default", 
               top_k: int = 5, threshold: float = 0.0) -> List[Dict[str, Any]]:
        """
        Search for similar documents using cosine similarity
        
        Args:
            query_embedding: Query vector
            collection_name: Collection to search
            top_k: Number of results to return
            threshold: Minimum similarity threshold (0-1)
        
        Returns:
            List of matching documents with similarity scores
        """
        if not self._initialized:
            self.initialize()
        
        # Use pgvector cosine similarity
        # Note: This requires a RPC function or raw SQL query
        # For now, use a simple approach with match_documents function
        
        try:
            # Call the match_documents RPC function (created in setup SQL)
            result = self.client.rpc(
                "match_documents",
                {
                    "query_embedding": query_embedding,
                    "match_count": top_k,
                    "filter_collection": collection_name,
                }
            ).execute()
            
            if not result.data:
                return []
            
            # Format results
            documents = []
            for row in result.data:
                # match_documents() already returns cosine similarity: 1 - distance
                similarity = row.get("similarity", 0)
                if similarity >= threshold:
                    documents.append({
                        "text": row.get("content", ""),
                        "metadata": row.get("metadata", {}),
                        "similarity": similarity,
                    })
            
            return documents
        except Exception as e:
            logger.error(f"Search failed: {e}")
            # Fallback: simple query without vector search
            return self._fallback_search(collection_name, top_k)
    
    def _fallback_search(self, collection_name: str, top_k: int) -> List[Dict[str, Any]]:
        """Fallback search without vector similarity (returns recent docs)"""
        try:
            result = self.client.table(self.table_name)\
                .select("content, metadata")\
                .eq("collection", collection_name)\
                .limit(top_k)\
                .execute()
            
            if not result.data:
                return []
            
            return [
                {"text": row["content"], "metadata": row["metadata"], "similarity": 0.0}
                for row in result.data
            ]
        except Exception as e:
            logger.error(f"Fallback search failed: {e}")
            return []
    
    def count(self, collection_name: str = "default") -> int:
        """Count documents in a collection"""
        if not self._initialized:
            self.initialize()
        
        try:
            result = self.client.table(self.table_name)\
                .select("id", count="exact")\
                .eq("collection", collection_name)\
                .execute()
            
            return result.count or 0
        except Exception as e:
            logger.error(f"Count failed: {e}")
            return 0
    
    def delete_collection(self, collection_name: str):
        """Delete all documents in a collection"""
        if not self._initialized:
            self.initialize()
        
        result = self.client.table(self.table_name)\
            .delete()\
            .eq("collection", collection_name)\
            .execute()
        
        logger.info(f"Deleted collection: {collection_name}")
