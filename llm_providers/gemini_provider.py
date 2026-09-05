import os
import logging
from typing import List, Optional, Any
from google import genai
from google.genai import types
from llm_providers.base import CodeGenProvider, ChatMessage
from prompts.system_prompts import MANIM_SYSTEM_PROMPT, MANIM_ERROR_FIX_PROMPT, FEW_SHOT_EXAMPLES

logger = logging.getLogger("ai_animator.gemini")

FALLBACK_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
]

class GeminiProvider(CodeGenProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        resolved_model = model or "gemini-3.6-flash"
        if resolved_model in ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.5-pro"]:
            resolved_model = "gemini-3.6-flash"

        super().__init__(api_key=api_key, model=resolved_model)
        resolved_key = self.api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.client = genai.Client(api_key=resolved_key) if resolved_key else None

    def get_provider_name(self) -> str:
        return "gemini"

    def _extract_text_from_response(self, response: Any) -> str:
        if hasattr(response, "text") and response.text:
            return response.text
        if hasattr(response, "candidates") and response.candidates:
            parts = response.candidates[0].content.parts
            texts = [p.text for p in parts if hasattr(p, "text") and p.text]
            return "\n".join(texts)
        return ""

    async def generate_scene(
        self,
        prompt: str,
        history: Optional[List[ChatMessage]] = None,
        prior_code: Optional[str] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        if not self.client:
            raise ValueError("Gemini API key not configured. Set GEMINI_API_KEY in environment or provide in request.")

        contents = []
        if not prior_code and FEW_SHOT_EXAMPLES:
            for ex in FEW_SHOT_EXAMPLES:
                contents.append(f"User: {ex['prompt']}")
                contents.append(f"Assistant: ```python\n{ex['code']}\n```")

        if history:
            for msg in history:
                if msg.role in ["user", "assistant"]:
                    contents.append(f"{msg.role.capitalize()}: {msg.content}")

        if prior_code:
            current_prompt = (
                f"Existing Code:\n```python\n{prior_code}\n```\n\n"
                f"User Modification Request:\n{prompt}\n\n"
                "Return the COMPLETE updated Python code for `class GenScene(Scene):` in a ```python ... ``` code block."
            )
        else:
            current_prompt = f"Create a complete Manim animation for the following:\n{prompt}"

        contents.append(f"User: {current_prompt}")
        full_text = "\n\n".join(contents)

        models_to_try = [self.model] + [m for m in FALLBACK_MODELS if m != self.model]
        last_error = None

        for model_candidate in models_to_try:
            try:
                response = await self.client.aio.models.generate_content(
                    model=model_candidate,
                    contents=full_text,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt or MANIM_SYSTEM_PROMPT,
                        temperature=0.2,
                    ),
                )
                extracted = self._extract_text_from_response(response)
                if extracted:
                    return self.extract_code_block(extracted)
            except Exception as e:
                logger.warning(f"Model {model_candidate} failed: {e}. Trying next...")
                last_error = e

        raise last_error or RuntimeError("All Gemini model candidates failed to generate content.")

    async def fix_error(
        self,
        code: str,
        error_trace: str,
        original_prompt: str,
        system_prompt: Optional[str] = None
    ) -> str:
        if not self.client:
            raise ValueError("Gemini API key not configured. Set GEMINI_API_KEY in environment or provide in request.")

        user_content = (
            f"Original Goal:\n{original_prompt}\n\n"
            f"Current Broken Code:\n```python\n{code}\n```\n\n"
            f"Execution Error Traceback:\n```text\n{error_trace}\n```\n\n"
            "Please fix all errors and return the COMPLETE valid Python code in a ```python ... ``` code block."
        )

        models_to_try = [self.model] + [m for m in FALLBACK_MODELS if m != self.model]
        last_error = None

        for model_candidate in models_to_try:
            try:
                response = await self.client.aio.models.generate_content(
                    model=model_candidate,
                    contents=user_content,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt or MANIM_ERROR_FIX_PROMPT,
                        temperature=0.1,
                    ),
                )
                extracted = self._extract_text_from_response(response)
                if extracted:
                    return self.extract_code_block(extracted)
            except Exception as e:
                logger.warning(f"Model {model_candidate} failed on fix_error: {e}. Trying next...")
                last_error = e

        raise last_error or RuntimeError("All Gemini model candidates failed on fix_error.")
