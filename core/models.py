from pydantic import BaseModel, HttpUrl
from typing import List

class HackRxRequest(BaseModel):
    """
    Defines the structure for the incoming request to the /hackrx/run endpoint.
    It expects a document URL and a list of questions.
    """
    documents: HttpUrl
    questions: List[str]
