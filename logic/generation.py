import os
import google.generativeai as genai
import json
from typing import List, Dict

# Configure the Gemini API with the key from the .env file
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Define the prompt template. This is the most critical part.
# It instructs the LLM on its role, the data to use, and how to format the output.
PROMPT_TEMPLATE = """
CONTEXT:
{context}

QUESTION:
{question}

INSTRUCTIONS:
You are an expert assistant for querying policy documents. Your task is to answer the user's QUESTION strictly based on the provided CONTEXT.
- If the CONTEXT contains the answer, provide a clear and concise answer.
- If the CONTEXT does not contain the information to answer the question, you MUST state: "The provided context does not contain enough information to answer this question."
- Your output MUST be a single, valid JSON object with the following two keys: "answer" and "sources".
- The "answer" key should contain your text response.
- The "sources" key should contain a list of the integer indices of the context chunks you used to formulate the answer.
"""

async def generate_answer(query: str, context: List[Dict]) -> Dict:
    """
    Generates an answer using the LLM based on the retrieved context.

    Args:
        query (str): The user's question.
        context (List[Dict]): A list of context chunks, where each chunk is a dictionary
                               with 'index' and 'text'.

    Returns:
        Dict: A dictionary containing the answer and the source chunks.
    """
    # Format the context for the prompt, including the source index for traceability
    context_str = "\n\n".join(
        f"Source Index: {item['index']}\nContent: {item['text']}" for item in context
    )

    # Format the final prompt
    formatted_prompt = PROMPT_TEMPLATE.format(context=context_str, question=query)

    # Initialize the Gemini model
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    # Generate the content
    response = await model.generate_content_async(formatted_prompt)

    try:
        # The model's response text should be a JSON string. We parse it.
        # This enforces the structured output requirement[cite: 19].
        # It also provides the explainable rationale[cite: 18].
        # Using .replace() to clean up potential markdown formatting from the LLM
        cleaned_response = response.text.strip().replace("```json", "").replace("```", "")
        result = json.loads(cleaned_response)
        return result
    except (json.JSONDecodeError, TypeError) as e:
        # Fallback if the LLM fails to return valid JSON
        print(f"Error decoding LLM response: {e}")
        return {
            "answer": "The model returned an invalid format. Defaulting response.",
            "sources": []
        }
