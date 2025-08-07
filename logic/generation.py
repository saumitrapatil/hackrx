import google.generativeai as genai
from core.models import Clause, ClauseType
from typing import List, Dict, Any
from z3 import *
import re
from datetime import datetime, timedelta
from typing import Tuple

class ReasoningAgent:
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        self.tools = {
            "temporal_reasoning": self.handle_temporal_logic,
            "constraint_solving": self.solve_constraints,
            "conflict_resolution": self.resolve_conflicts
        }
    
    # The individual tool functions (handle_temporal_logic, solve_constraints, etc.) remain unchanged.
    def handle_temporal_logic(self, context: str, query: str) -> Tuple[str, float]:
        date_pattern = r'\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b'
        dates = re.findall(date_pattern, context)
        start_date, current_date, waiting_period = Ints('start_date current_date waiting_period')
        s = Solver()
        if "24 months" in context: s.add(waiting_period == 730)
        elif "12 months" in context: s.add(waiting_period == 365)
        else:
            month_match = re.search(r'(\d+)\s+months?', context)
            if month_match: s.add(waiting_period == int(month_match.group(1)) * 30)
        if dates:
            policy_start = datetime(*map(int, dates[0]))
            today_match = re.search(r'current date is (\d{1,2}/\d{1,2}/\d{4})', query)
            current_date_val = datetime.strptime(today_match.group(1), "%d/%m/%Y") if today_match else datetime.now()
            days_since_start = (current_date_val - policy_start).days
            s.add(start_date == 0, current_date == days_since_start, current_date >= start_date + waiting_period)
            return ("Coverage is available", 0.95) if s.check() == sat else ("Waiting period not completed", 0.90)
        return "", 0.0

    def solve_constraints(self, context: str, query: str) -> Tuple[str, float]:
        sum_insured, limit, copay, age = Ints('sum_insured limit copay age')
        s = Solver()
        if "copay" in context.lower() and "age" in query.lower():
            age_match = re.search(r'age (\d+)', query)
            if age_match: s.add(age == int(age_match.group(1)), If(age >= 75, copay == 5, copay == 0))
        if "limit" in context.lower() and "sum insured" in context.lower():
            s.add(limit == If(sum_insured > 500000, 75000, 50000))
        if "per eye" in context.lower(): s.add(limit == 40000)
        if s.check() == sat:
            model = s.model()
            result = [f"{str(var)} = {model[var]}" for var in [sum_insured, limit, copay, age] if model[var] is not None]
            return "; ".join(result), 0.92
        return "", 0.0

    def resolve_conflicts(self, context: str, query: str) -> Tuple[str, float]:
        contexts = context.split("\n\n")
        coverage_flags = [1 for c in contexts if "cover" in c.lower()]
        exclusion_flags = [1 for c in contexts if "not cover" in c.lower()]
        if sum(coverage_flags) > 0 and sum(exclusion_flags) > 0:
            specific_clauses = [c for c in contexts if "except" in c or "however" in c]
            if specific_clauses: return specific_clauses[0], 0.85
            return contexts[-1], 0.80
        return "", 0.0

    def calculate_confidence(self, answer: str, contexts: List[str]) -> float:
        confidence = 0.85
        if "not cover" in answer.lower(): confidence *= 0.9
        if any("exception" in c for c in contexts): confidence *= 0.95
        if any(num in answer for num in ["$", "₹", "€", "£"]): confidence *= 1.05
        return min(max(confidence, 0.5), 0.99)

    async def generate_answer(self, question: str, contexts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        FIXED: Redesigned generation logic for consistency and cleanliness.
        """
        context_text = "\n\n".join([c["text"] for c in contexts])
        
        # Step 1: Try specialized tools first
        tool_results = []
        for tool_name, tool_fn in self.tools.items():
            result, confidence = tool_fn(context_text, question)
            if result:
                tool_results.append({
                    "tool": tool_name,
                    "result": result,
                    "confidence": confidence
                })
        
        # Step 2: Decide whether to use a tool's output or the main LLM prompt
        final_prompt = ""
        source = "llm_generation"

        if tool_results:
            best_result = max(tool_results, key=lambda x: x["confidence"])
            if best_result["confidence"] > 0.9:
                # If a tool is very confident, use its result but have the LLM format it nicely.
                source = f"tool_assisted:{best_result['tool']}"
                final_prompt = f"""
                Based on the following key information: "{best_result['result']}"
                
                Provide a direct and concise answer to the user's question: "{question}"
                """
            
        if not final_prompt:
            # If no tool was confident enough, use the full RAG prompt.
            # FIXED: The prompt is now simpler and asks for a direct answer.
            final_prompt = f"""
            You are an expert insurance analyst. Your task is to provide a clear and concise answer to the user's question based ONLY on the provided policy context. Do not show your reasoning steps.

            Policy Context:
            {context_text}

            User Query: {question}

            Final Answer:
            """
        
        # Step 3: Generate the final answer
        response = await self.model.generate_content_async(final_prompt)
        
        # Step 4: Clean the final output
        # This removes the verbose reasoning and any unwanted markdown.
        answer_text = response.text.split("Final Answer:")[-1]
        cleaned_answer = answer_text.strip(' *\n')
        
        confidence = self.calculate_confidence(cleaned_answer, context_text.split("\n\n"))
        
        return {
            "answer": cleaned_answer,
            "confidence": confidence,
            "source": source
        }