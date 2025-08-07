from fastapi import FastAPI, Depends, HTTPException, status
from core.models import HackRxRequest
from core.security import verify_token
from logic.document_loader import load_document_from_url
from logic.retrieval import chunk_text, create_faiss_index, search_index
from logic.generation import generate_answer

# Initialize the FastAPI application
app = FastAPI(
    title="HackRx 6.0 Intelligent Query-Retrieval System",
    description="Processes documents to answer contextual questions.",
    version="1.0.0"
)

@app.post(
    "/api/v1/hackrx/run",
    summary="Run Submissions",
    dependencies=[Depends(verify_token)]
)
async def run_submission(request: HackRxRequest):
    """
    This endpoint orchestrates the entire query-retrieval and answer generation pipeline.
    """
    try:
        # Step 1: Load and extract text from the document
        extracted_text = await load_document_from_url(str(request.documents))
        
        # Step 2: Chunk the text
        text_chunks = chunk_text(extracted_text)
        
        # Step 3: Create a searchable FAISS index
        document_index = create_faiss_index(text_chunks)
        
        # Step 4: Process each question to generate an answer
        final_answers = []
        for question in request.questions:
            # 4a. Retrieve relevant context
            relevant_context = search_index(question, document_index, text_chunks)
            
            # 4b. Generate a structured answer from the context using the LLM
            llm_result = await generate_answer(question, relevant_context)
            
            # Append just the answer string to the final list, as per the required output format
            final_answers.append(llm_result.get("answer", "No answer could be generated."))

        # Final Step: Return the response in the specified format [cite: 102]
        return {"answers": final_answers}
        
    except (ConnectionError, IOError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"An unexpected error occurred in main: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected server error occurred: {e}"
        )

@app.get("/", summary="Health Check")
async def read_root():
    """A simple health check endpoint."""
    return {"status": "ok", "message": "Query-Retrieval System is running."}
