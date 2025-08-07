import requests
import fitz
import docx
import io

async def load_document_from_url(url: str) -> str:
    """
    Fetches a document from a URL and extracts its text content.
    Supports PDF and DOCX file types.

    Args:
        url (str): The URL of the document to process.

    Returns:
        str: The extracted text from the document.
        
    Raises:
        HTTPException: If the document cannot be fetched or the format is unsupported.
    """
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raises an exception for bad status codes (4xx or 5xx)

        content_type = response.headers.get('Content-Type', '')
        
        # Determine file type from URL extension or content type
        if url.endswith('.pdf') or 'application/pdf' in content_type:
            # Process PDF
            pdf_document = fitz.open(stream=response.content, filetype="pdf")
            text = "".join(page.get_text() for page in pdf_document)
            pdf_document.close()
            return text
        elif url.endswith('.docx') or 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' in content_type:
            # Process DOCX
            doc = docx.Document(io.BytesIO(response.content))
            text = "\n".join([para.text for para in doc.paragraphs])
            return text
        else:
            raise ValueError("Unsupported document format. Only PDF and DOCX are supported.")

    except requests.exceptions.RequestException as e:
        raise ConnectionError(f"Failed to fetch document from URL: {e}")
    except Exception as e:
        raise IOError(f"Failed to process document: {e}")
