from fastapi import FastAPI, Depends, HTTPException, status
from core.models import HackRxRequest
from core.security import verify_token
from logic.document_loader import load_document_from_url
from logic.retrieval import chunk_text, create_faiss_index, search_index
from logic.generation import ReasoningAgent
import os
import time
import logging

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the FastAPI application
app = FastAPI(
    title="Cognitive Clause Intelligence (CCI) Framework",
    description="Advanced Insurance Document Analysis System",
    version="2.1.0"
)

# Global cache for document indices
document_cache = {}

async def get_agent() -> ReasoningAgent:
    """Get the reasoning agent with API key"""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google API key not configured"
        )
    return ReasoningAgent(api_key)

@app.post(
    "/api/v1/hackrx/run",
    summary="Run Submissions",
    dependencies=[Depends(verify_token)]
)
async def run_submission(request: HackRxRequest):
    """Orchestrate the CCI pipeline with multi-agent reasoning"""
    try:
        start_time = time.time()
        
        cache_key = f"{request.documents}-{hash(frozenset(request.questions))}"
        if cache_key in document_cache:
            logger.info("Using cached document index")
            document_index, text_chunks = document_cache[cache_key]
        else:
            logger.info("Processing document...")
            structured_clauses = await load_document_from_url(str(request.documents))
            text_chunks = chunk_text(structured_clauses)
            document_index = create_faiss_index(text_chunks)
            document_cache[cache_key] = (document_index, text_chunks)
        
        agent = await get_agent()
        
        final_answers = []
        confidence_scores = []
        sources = []
        
        for question in request.questions:
            # FIXED: Increased top_k to 12 for a wider context window to improve retrieval accuracy.
            relevant_context = search_index(
                question, 
                document_index, 
                text_chunks,
                top_k=12,
                depth=3
            )
            
            result = await agent.generate_answer(question, relevant_context)
            
            final_answers.append(result["answer"])
            confidence_scores.append(result["confidence"])
            sources.append(result["source"])
        
        # Quality assurance step remains the same
        for i in range(len(final_answers)):
            if confidence_scores[i] < 0.75:
                logger.warning(f"Low confidence ({confidence_scores[i]}) for question: {request.questions[i]}")
                relevant_context = search_index(
                    request.questions[i], 
                    document_index, 
                    text_chunks,
                    top_k=15, # Further increase context for reruns
                    depth=5
                )
                result = await agent.generate_answer(request.questions[i], relevant_context)
                final_answers[i] = result["answer"]
                confidence_scores[i] = result["confidence"]
                sources[i] = result["source"] + "_rerun"
        
        processing_time = time.time() - start_time
        logger.info(f"Processed {len(request.questions)} questions in {processing_time:.2f}s")
        
        return {"answers": final_answers}
        
    except (ConnectionError, IOError, ValueError) as e:
        logger.error(f"Input error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected server error occurred: {e}"
        )

@app.get("/", summary="Health Check")
async def read_root():
    """Service health check"""
    return {
        "status": "ok",
        "version": "2.1.0",
        "system": "Cognitive Clause Intelligence Framework"
    }

@app.get("/cache/clear", summary="Clear Cache")
async def clear_cache():
    """Clear document cache"""
    global document_cache
    count = len(document_cache)
    document_cache = {}
    return {"status": "cache cleared", "items_removed": count}