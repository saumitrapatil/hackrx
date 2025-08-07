import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi
from typing import List, Tuple, Dict, Any
from core.models import Clause, ClauseType
import networkx as nx
import re

class MatryoshkaEncoder:
    def __init__(self):
        self.model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        # FIXED: Programmatically get the model's actual max dimension.
        self.max_dimension = self.model.get_sentence_embedding_dimension() # This will be 384
        
        # FIXED: Use a valid list of sub-dimensions that are <= the max dimension.
        self.dimensions = [256, 128, 64]
    
    def encode(self, text: str) -> Dict[int, np.ndarray]:
        full_embedding = self.model.encode([text])[0]
        embeddings = {}
        
        for dim in self.dimensions:
            # Slicing the full embedding to the target sub-dimension
            embeddings[dim] = full_embedding[:dim]
        
        return embeddings

class HybridIndex:
    def __init__(self, clauses: List[Clause]):
        self.clauses = clauses
        self.encoder = MatryoshkaEncoder()
        self.bm25 = BM25Okapi([self._preprocess(c.text) for c in clauses])
        
        # Create multi-resolution FAISS indices
        self.indices = {}
        for dim in self.encoder.dimensions:
            self.indices[dim] = faiss.IndexFlatL2(dim)
        
        # Store embeddings for each dimension
        self.embeddings = {dim: [] for dim in self.encoder.dimensions}
        
        # Build indices
        for clause in clauses:
            # This check prevents adding empty clauses to the index
            if not clause.text.strip():
                continue
            embeddings = self.encoder.encode(clause.text)
            for dim, emb in embeddings.items():
                self.embeddings[dim].append(emb)
        
        # Add embeddings to indices
        for dim in self.encoder.dimensions:
            # Ensure there's something to add before proceeding
            if self.embeddings[dim]:
                emb_array = np.array(self.embeddings[dim], dtype=np.float32)
                self.indices[dim].add(emb_array)
        
        # Create knowledge graph
        self.graph = nx.DiGraph()
        for i, clause in enumerate(clauses):
            self.graph.add_node(i, text=clause.text, type=clause.clause_type.value)
            for dep in clause.dependencies:
                self.graph.add_edge(i, dep, relationship="depends_on")
    
    def _preprocess(self, text: str) -> List[str]:
        # Tokenize for BM25
        return re.findall(r'\w+', text.lower())
    
    def search(self, query: str, top_k: int = 5) -> List[Tuple[int, float]]:
        # Vector search at multiple resolutions
        vector_results = {}
        query_embeddings = self.encoder.encode(query)
        
        for dim, emb in query_embeddings.items():
            # Check if the index for this dimension is trained and has vectors
            if self.indices[dim].is_trained and self.indices[dim].ntotal > 0:
                D, I = self.indices[dim].search(np.array([emb], dtype=np.float32), top_k * 3)
                for i, dist in zip(I[0], D[0]):
                    if i not in vector_results:
                        vector_results[i] = 0
                    # Weight by dimension resolution (higher dim = more weight)
                    vector_results[i] += (1 - dist / 10) * (dim / self.encoder.max_dimension)
        
        # Lexical search
        tokenized_query = self._preprocess(query)
        bm25_scores = self.bm25.get_scores(tokenized_query)
        lexical_results = {i: score for i, score in enumerate(bm25_scores)}
        
        # Hybrid ranking
        combined_scores = {}
        for i in range(len(self.clauses)):
            vec_score = vector_results.get(i, 0)
            lex_score = lexical_results.get(i, 0)
            combined_scores[i] = (0.7 * vec_score) + (0.3 * lex_score)
        
        # Get top results
        sorted_results = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_results[:top_k]
    
    def get_related_clauses(self, clause_id: int, depth: int = 2) -> List[int]:
        """Get related clauses using the knowledge graph"""
        if clause_id not in self.graph:
            return []
        
        related = set()
        # Get dependencies
        for dep in nx.dfs_preorder_nodes(self.graph, clause_id, depth_limit=depth):
            related.add(dep)
        
        # Get dependents
        for source in self.graph.predecessors(clause_id):
            related.add(source)
        
        return list(related)

# The rest of the functions (chunk_text, create_faiss_index, search_index) remain the same
def chunk_text(clauses: List[Clause]) -> List[Dict[str, Any]]:
    """Enhanced chunking preserving structure"""
    chunks = []
    for clause in clauses:
        chunk = {
            "text": clause.text,
            "metadata": {
                "type": clause.clause_type.value,
                "hierarchy": clause.hierarchy_level,
                "dependencies": clause.dependencies,
                **clause.metadata
            }
        }
        chunks.append(chunk)
    return chunks

def create_faiss_index(clauses: List[Dict[str, Any]]) -> HybridIndex:
    """Create enhanced hybrid index"""
    # Convert back to Clause objects
    clause_objects = []
    for chunk in clauses:
        clause = Clause(
            text=chunk["text"],
            clause_type=ClauseType(chunk["metadata"]["type"]),
            hierarchy_level=chunk["metadata"]["hierarchy"],
            dependencies=chunk["metadata"].get("dependencies", []),
            metadata={k: v for k, v in chunk["metadata"].items() 
                      if k not in ["type", "hierarchy", "dependencies"]}
        )
        clause_objects.append(clause)
    
    return HybridIndex(clause_objects)

def search_index(query: str, index: HybridIndex, chunks: List[Dict[str, Any]], 
                top_k: int = 5, depth: int = 2) -> List[Dict[str, Any]]:
    """Enhanced retrieval with context expansion"""
    results = index.search(query, top_k)
    context_chunks = []
    
    # Use a set to avoid adding duplicate chunks
    added_indices = set()

    for clause_id, score in results:
        # Expand with related clauses
        related_ids = index.get_related_clauses(clause_id, depth)
        for rid in related_ids:
            if rid != clause_id and rid < len(chunks) and rid not in added_indices:
                context_chunks.append(chunks[rid])
                added_indices.add(rid)

        # Add the main retrieved chunk if not already added
        if clause_id < len(chunks) and clause_id not in added_indices:
            context_chunks.append(chunks[clause_id])
            added_indices.add(clause_id)
    
    return context_chunks