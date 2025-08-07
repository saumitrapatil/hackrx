## Tech Stack

-   **Backend**: FastAPI
-   **Document Parsing**: PyMuPDF, python-docx
-   **Vector Search**: FAISS (Facebook AI Similarity Search)
-   **Embeddings**: Sentence-Transformers (`all-MiniLM-L6-v2`)
-   **LLM**: Google Gemini 1.5 Flash

---

## Prerequisites

Before you begin, ensure you have the following installed:
-   Python 3.9+
-   `pip` (Python package installer)
-   A Google Account to obtain a Gemini API Key.

---

## Setup & Installation

Follow these steps to get your local development environment set up.

### 1. Clone the Repository
Clone this project to your local machine.
```bash
git clone <your-repository-url>
cd <repository-folder>
```

### 2. Create a Virtual Environment
It's highly recommended to use a virtual environment to manage project dependencies.

On macOS / Linux:
```bash
python3 -m venv venv
source venv/bin/activate
```

On Windows:
```pwsh
python -m venv venv
.\venv\Scripts\activate
```

### 3. Install Dependencies
Install all the required Python packages from the requirements.txt file.
```bash
pip install -r requirements.txt
```
### 4. Configure Environment Variables
The application requires an .env file in the project root for storing secret keys.

Create a new file named .env and add the following content:
```
# The Bearer token provided in the HackRx documentation
AUTH_TOKEN=<token-here>

# Your secret API key for the LLM
GOOGLE_API_KEY=<your-gemini-api-key-here>
```
#### To get your GOOGLE_API_KEY:

- Go to Google AI Studio (aistudio.google.com).
- Sign in and click "Get API key".
- Create a new API key and copy it into the .env file.
#### Running the Application
Once the setup is complete, you can start the local development server using Uvicorn.
```bash
uvicorn main:app --reload
```
The application will be running on http://localhost:8000. You can access the auto-generated API documentation at http://localhost:8000/docs.
