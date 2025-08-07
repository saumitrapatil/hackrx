import os
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Load environment variables from .env file
load_dotenv()

# Scheme for bearer token authentication
bearer_scheme = HTTPBearer()
SECRET_TOKEN = os.getenv("AUTH_TOKEN")

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """
    A FastAPI dependency to verify the Bearer token.
    Compares the provided token with the secret token from environment variables.
    
    Raises:
        HTTPException: 401 Unauthorized if the token is invalid or missing.
    """
    if not SECRET_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication token not configured on the server."
        )

    # The token is provided in the documentation [cite: 74, 87]
    if credentials.scheme != "Bearer" or credentials.credentials != SECRET_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials
