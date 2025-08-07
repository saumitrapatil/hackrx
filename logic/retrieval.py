from typing import List
from sentence_transformers import SentenceTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter
import faiss
import numpy as np

# 1. Initialize the embedding model
# This model will be used to convert text into numerical vectors (embeddings).
# We are using a fast and efficient open-source model.
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# Get the dimensionality of the embeddings, which is required by FAISS.
# For 'all-MiniLM-L6-v2', the dimension is 384.
EMBEDDING_DIM = embedding_model.get_sentence_embedding_dimension()


def chunk_text(text: str) -> List[str]:
    """
    Splits a long text into smaller, semantically meaningful chunks.
    This is necessary to fit the context into the LLM's prompt.

    Args:
        text (str): The full text extracted from a document.

    Returns:
        List[str]: A list of text chunks.
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,  # Max size of each chunk
        chunk_overlap=150,  # Overlap between consecutive chunks
        length_function=len
    )
    return text_splitter.split_text(text)


def create_faiss_index(chunks: List[str]) -> faiss.Index:
    """
    [cite_start]Creates a FAISS index from a list of text chunks. [cite: 16, 37]

    This involves two steps:
    1. Generate embeddings for all text chunks.
    2. Add these embeddings to a FAISS index for fast searching.

    Args:
        chunks (List[str]): The list of text chunks from the document.

    Returns:
        faiss.Index: A FAISS index containing the document's embeddings.
    """
    # Generate embeddings for each chunk
    embeddings = embedding_model.encode(chunks, convert_to_tensor=False)
    
    # Create a FAISS index. IndexFlatL2 is a basic but effective index for dense vectors.
    index = faiss.IndexFlatL2(EMBEDDING_DIM)
    
    # Add the embeddings to the index
    index.add(np.array(embeddings))
    
    return index


def search_index(query: str, index: faiss.Index, chunks: List[str], top_k: int = 5) -> List[Dict]:
    """
    Performs semantic search to find the most relevant chunks for a user's query.

    Args:
        query (str): The user's question.
        index (faiss.Index): The FAISS index of the document.
        chunks (List[str]): The original text chunks.
        top_k (int): The number of top relevant chunks to retrieve.

    Returns:
        List[Dict]: A list of dictionaries, each containing the 'index' and 'text'
                    of the most relevant chunks.
    """
    query_embedding = embedding_model.encode([query])
    distances, indices = index.search(query_embedding, top_k)
    
    # Retrieve both the index and the text of the relevant chunks
    relevant_chunks = [
        {"index": i, "text": chunks[i]} for i in indices[0]
    ]
    
    return relevant_chunks
