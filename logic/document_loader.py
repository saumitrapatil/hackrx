import requests
import fitz  # PyMuPDF
from typing import List
from core.models import Clause, ClauseType

# Note: The advanced rhetorical and structural analysis has been simplified to
# ensure the core functionality works without heavy dependencies.
# This focuses on the primary goal of text extraction and question-answering.

async def load_document_from_url(url: str) -> List[Clause]:
    """
    FIXED: Loads a document from a URL using PyMuPDF to avoid OCR dependency issues.
    This implementation is robust for text-based PDFs.
    """
    try:
        # Step 1: Fetch the document content from the URL
        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for bad status codes

        # Step 2: Open the PDF content with PyMuPDF
        pdf_document = fitz.open(stream=response.content, filetype="pdf")

        structured_clauses = []
        # Step 3: Iterate through pages and extract text
        for page_num, page in enumerate(pdf_document):
            text_content = page.get_text("text")
            
            # Simple clause creation for each non-empty paragraph
            # We assign a default 'COVERAGE' type as a fallback.
            paragraphs = [p.strip() for p in text_content.split('\n') if p.strip()]
            for para in paragraphs:
                clause = Clause(
                    text=para,
                    clause_type=ClauseType.COVERAGE, # Default type
                    hierarchy_level=2, # Default level
                    metadata={
                        "source": url,
                        "page": str(page_num + 1)
                    }
                )
                structured_clauses.append(clause)

        pdf_document.close()
        return structured_clauses

    except requests.exceptions.RequestException as e:
        raise ConnectionError(f"Failed to fetch document from URL: {e}")
    except Exception as e:
        raise IOError(f"Failed to process PDF with PyMuPDF: {e}")