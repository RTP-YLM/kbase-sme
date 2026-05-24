"""
RAG Engine
Core retrieval-augmented generation logic
"""
from typing import List, Optional, Dict, Any
from pathlib import Path
import logging

from config import Config
from llm_provider import BaseLLMProvider, get_llm_provider

logger = logging.getLogger(__name__)


class RAGEngine:
    """Main RAG engine for question answering"""
    
    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()
        self.llm: Optional[BaseLLMProvider] = None
        self.vector_store = None
        self.embeddings = None
        self._initialized = False
    
    def initialize(self):
        """Initialize LLM and vector store"""
        if self._initialized:
            return
        
        # Initialize LLM provider
        llm_config = self.config.llm
        logger.info(f"Initializing LLM: {llm_config.get('provider')} / {llm_config.get('model')}")
        self.llm = get_llm_provider(
            provider_name=llm_config.get("provider", "ollama"),
            config=llm_config,
        )
        
        # Initialize embeddings
        from sentence_transformers import SentenceTransformer
        embedding_model = self.config.rag.get("embedding_model", "all-MiniLM-L6-v2")
        logger.info(f"Loading embedding model: {embedding_model}")
        self.embeddings = SentenceTransformer(embedding_model)
        
        # Initialize vector store based on config
        vector_store_type = self.config.rag.get("vector_store", "chroma")
        
        if vector_store_type == "supabase":
            from supabase_vector_store import SupabaseVectorStore
            supabase_url = self.config.rag.get("supabase_url")
            supabase_key = self.config.rag.get("supabase_key")
            
            if not supabase_url or not supabase_key:
                raise ValueError("Supabase URL and key required. Set SUPABASE_URL and SUPABASE_KEY in .env")
            
            logger.info(f"Initializing Supabase vector store: {supabase_url}")
            self.vector_store = SupabaseVectorStore(
                supabase_url=supabase_url,
                supabase_key=supabase_key,
                table_name=self.config.rag.get("supabase_table", "documents"),
            )
            self.vector_store.initialize()
        else:
            # Chroma (default)
            from chromadb import PersistentClient
            persist_dir = self.config.rag.get("persist_directory", "./data/vectorstore")
            Path(persist_dir).mkdir(parents=True, exist_ok=True)
            
            logger.info(f"Initializing Chroma vector store: {persist_dir}")
            self.vector_store = PersistentClient(path=persist_dir)
        
        self._initialized = True
        logger.info("RAG Engine initialized")
    
    def _get_or_create_collection(self, name: str):
        """Get or create collection with cosine similarity metric"""
        try:
            # Try to get existing collection
            return self.vector_store.get_collection(name=name)
        except Exception:
            # Create new collection with cosine similarity
            return self.vector_store.create_collection(
                name=name,
                metadata={"hnsw:space": "cosine"}
            )
    
    def add_documents(self, documents: List[Dict[str, str]], collection_name: str = "documents"):
        """
        Add documents to vector store
        
        Args:
            documents: List of dicts with 'text' and optional 'metadata'
            collection_name: Name of the collection
        """
        if not self._initialized:
            self.initialize()
        
        vector_store_type = self.config.rag.get("vector_store", "chroma")
        
        if vector_store_type == "supabase":
            # Supabase: generate embeddings and add with metadata
            for i, doc in enumerate(documents):
                text = doc.get("text", "")
                metadata = doc.get("metadata", {})
                
                if not text.strip():
                    continue
                
                # Generate embedding
                embedding = self.embeddings.encode(text).tolist()
                
                # Add to Supabase
                supabase_doc = {
                    "text": text,
                    "embedding": embedding,
                    "metadata": metadata,
                }
                self.vector_store.add_documents([supabase_doc], collection_name=collection_name)
            
            logger.info(f"Added {len(documents)} documents to Supabase collection '{collection_name}'")
        else:
            # Chroma
            collection = self._get_or_create_collection(name=collection_name)
            
            for i, doc in enumerate(documents):
                text = doc.get("text", "")
                metadata = doc.get("metadata", {})
                
                if not text.strip():
                    continue
                
                # Generate embedding
                embedding = self.embeddings.encode(text).tolist()
                
                # Add to collection
                collection.add(
                    embeddings=[embedding],
                    documents=[text],
                    metadatas=[metadata],
                    ids=[f"doc_{collection.count() + i}"],
                )
            
            logger.info(f"Added {len(documents)} documents to Chroma collection '{collection_name}'")
    
    def query(self, question: str, collection_name: str = "documents", top_k: Optional[int] = None) -> Dict[str, Any]:
        """
        Query the RAG system
        
        Args:
            question: User question
            collection_name: Collection to query
            top_k: Number of documents to retrieve
        
        Returns:
            Dict with 'answer', 'sources', 'query_time'
        """
        if not self._initialized:
            self.initialize()
        
        import time
        start_time = time.time()
        
        # Get config
        top_k = top_k or self.config.rag.get("top_k", 3)
        threshold = self.config.rag.get("similarity_threshold", 0.5)
        
        # Generate query embedding
        query_embedding = self.embeddings.encode(question).tolist()
        
        # Search vector store
        vector_store_type = self.config.rag.get("vector_store", "chroma")
        
        if vector_store_type == "supabase":
            # Supabase search
            results = self.vector_store.search(
                query_embedding=query_embedding,
                collection_name=collection_name,
                top_k=top_k,
                threshold=threshold,
            )
            
            documents = [r["text"] for r in results]
            metadatas = [r["metadata"] for r in results]
            similarities = [r["similarity"] for r in results]
        else:
            # Chroma search
            collection = self._get_or_create_collection(name=collection_name)
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k * 2,  # Get more for filtering
            )
            
            # Filter by similarity threshold
            documents = []
            metadatas = []
            similarities = []
            
            for i, distance in enumerate(results["distances"][0]):
                # Chroma with cosine metric: distance = 1 - similarity
                similarity = 1 - distance
                
                if similarity >= threshold:
                    documents.append(results["documents"][0][i])
                    metadatas.append(results["metadatas"][0][i])
                    similarities.append(similarity)
            
            # Limit to top_k
            documents = documents[:top_k]
            metadatas = metadatas[:top_k]
            similarities = similarities[:top_k]
        
        # Build context
        context = "\n\n".join([f"[Source {i+1}]: {doc}" for i, doc in enumerate(documents)])
        
        # Generate answer
        prompt = self._build_prompt(question, context)
        answer = self.llm.generate(prompt)
        
        query_time = time.time() - start_time
        
        return {
            "answer": answer,
            "sources": [
                {"text": doc, "metadata": meta, "similarity": sim}
                for doc, meta, sim in zip(documents, metadatas, similarities)
            ],
            "query_time": query_time,
            "question": question,
        }
    
    def _build_prompt(self, question: str, context: str) -> str:
        """Build RAG prompt for LLM"""
        prompt = f"""You are a helpful assistant answering questions based on the provided context.

Context:
{context}

Question: {question}

Instructions:
- Answer based ONLY on the context provided
- If the answer is not in the context, say "I don't have enough information to answer this question"
- Be concise and direct
- Cite sources when possible (e.g., "According to Source 1...")

Answer:"""
        return prompt
    
    def query_stream(self, question: str, collection_name: str = "documents", top_k: Optional[int] = None):
        """
        Query with streaming response
        
        Yields:
            Chunks of the answer
        """
        if not self._initialized:
            self.initialize()
        
        # First, get sources (non-streaming)
        query_embedding = self.embeddings.encode(question).tolist()
        top_k = top_k or self.config.rag.get("top_k", 3)
        
        collection = self.vector_store.get_collection(name=collection_name)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
        )
        
        documents = results["documents"][0] if results["documents"] else []
        context = "\n\n".join([f"[Source {i+1}]: {doc}" for i, doc in enumerate(documents)])
        
        # Stream the answer
        prompt = self._build_prompt(question, context)
        for chunk in self.llm.generate_stream(prompt):
            yield chunk
    
    def get_collection_stats(self, collection_name: str = "documents") -> Dict[str, Any]:
        """Get statistics about a collection"""
        if not self._initialized:
            self.initialize()
        
        vector_store_type = self.config.rag.get("vector_store", "chroma")
        
        if vector_store_type == "supabase":
            count = self.vector_store.count(collection_name=collection_name)
            return {
                "collection_name": collection_name,
                "document_count": count,
                "vector_store": "supabase",
            }
        else:
            collection = self.vector_store.get_collection(name=collection_name)
            count = collection.count()
            return {
                "collection_name": collection_name,
                "document_count": count,
                "vector_store": "chroma",
            }
    
    def delete_collection(self, collection_name: str = "documents"):
        """Delete a collection"""
        if not self._initialized:
            self.initialize()
        
        vector_store_type = self.config.rag.get("vector_store", "chroma")
        
        if vector_store_type == "supabase":
            self.vector_store.delete_collection(collection_name=collection_name)
            logger.info(f"Deleted Supabase collection: {collection_name}")
        else:
            self.vector_store.delete_collection(name=collection_name)
            logger.info(f"Deleted Chroma collection: {collection_name}")
