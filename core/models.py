from pydantic import BaseModel, HttpUrl
from typing import List, Dict, Any, Optional
from enum import Enum

class ClauseType(str, Enum):
    DEFINITION = "definition"
    CONDITION = "condition"
    EXCLUSION = "exclusion"
    COVERAGE = "coverage"
    TEMPORAL = "temporal"
    CALCULATION = "calculation"
    EXCEPTION = "exception"
    STAKEHOLDER = "stakeholder"
    JURISDICTION = "jurisdiction"

class Clause(BaseModel):
    text: str
    clause_type: ClauseType
    hierarchy_level: int
    dependencies: List[int] = []
    constraints: Dict[str, Any] = {}
    metadata: Dict[str, str] = {}

class HackRxRequest(BaseModel):
    documents: HttpUrl
    questions: List[str]