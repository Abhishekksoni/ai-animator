import os
from typing import List, Optional
from openai import AsyncOpenAI
from llm_providers.base import CodeGenProvider, ChatMessage
from prompts.system_prompts import MANIM_SYSTEM_PROMPT, MANIM_ERROR_FIX_PROMPT, FEW_SHOT_EXAMPLES

class OpenAIProvider(CodeGenProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        super().__init__(api_key=api_key, model=model or "gpt-4o")
        resolved_key = self.api_key or os.getenv("OPENAI_API_KEY")
        self.client = AsyncOpenAI(api_key=resolved_key) if resolved_key else None

    def get_provider_name(self) -> str:
        return "openai"

    async def generate_scene(
        self,
        prompt: str,
        history: Optional[List[ChatMessage]] = None,
        prior_code: Optional[str] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        if not self.client:
            raise ValueError("OpenAI API key not configured. Set OPENAI_API_KEY in environment or provide in request.")

        messages = [
            {"role": "system", "content": system_prompt or MANIM_SYSTEM_PROMPT}
        ]

        # Add few-shot examples if no prior code
        if not prior_code and FEW_SHOT_EXAMPLES:
            for ex in FEW_SHOT_EXAMPLES:
                messages.append({"role": "user", "content": ex["prompt"]})
                messages.append({"role": "assistant", "content": f"```python\n{ex['code']}\n```"})

        # Add conversation history
        if history:
            for msg in history:
                if msg.role in ["user", "assistant"]:
                    messages.append({"role": msg.role, "content": msg.content})

        # Add user prompt or iteration instructions
        if prior_code:
            current_prompt = (
                f"Here is the existing Manim code for the scene:\n```python\n{prior_code}\n```\n\n"
                f"Please update or modify this scene according to the following instruction:\n{prompt}\n\n"
                "Return the COMPLETE updated code for `class GenScene(Scene):` in a ```python ... ``` code block."
            )
        else:
            current_prompt = f"Create a complete Manim animation for the following:\n{prompt}"

        messages.append({"role": "user", "content": current_prompt})

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.2,
        )

        content = response.choices[0].message.content or ""
        return self.extract_code_block(content)

    async def fix_error(
        self,
        code: str,
        error_trace: str,
        original_prompt: str,
        system_prompt: Optional[str] = None
    ) -> str:
        if not self.client:
            raise ValueError("OpenAI API key not configured. Set OPENAI_API_KEY in environment or provide in request.")

        messages = [
            {"role": "system", "content": system_prompt or MANIM_ERROR_FIX_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Original Goal:\n{original_prompt}\n\n"
                    f"Current Broken Code:\n```python\n{code}\n```\n\n"
                    f"Execution Error Traceback:\n```text\n{error_trace}\n```\n\n"
                    "Please fix all errors and return the COMPLETE valid Python code in a ```python ... ``` code block."
                )
            }
        ]

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.1,
        )

        content = response.choices[0].message.content or ""
        return self.extract_code_block(content)
