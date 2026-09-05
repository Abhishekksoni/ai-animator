from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str

class CodeGenProvider(ABC):
    """
    Abstract Base Class for LLM Code Generation Providers.
    Encapsulates scene generation, iterative error fixing, and model metadata.
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key
        self.model = model

    @abstractmethod
    async def generate_scene(
        self,
        prompt: str,
        history: Optional[List[ChatMessage]] = None,
        prior_code: Optional[str] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Generate Manim Python code from a natural language prompt,
        taking into account conversation history and prior scene code if editing.
        """
        pass

    @abstractmethod
    async def fix_error(
        self,
        code: str,
        error_trace: str,
        original_prompt: str,
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Refactor and fix broken Manim Python code given the error traceback.
        """
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Returns the provider identifier name (e.g., 'openai', 'anthropic', 'gemini')."""
        pass

    def extract_code_block(self, response_text: str) -> str:
        """
        Helper method to extract pure Python code from LLM markdown fences.
        """
        text = response_text.strip()
        if "```python" in text:
            parts = text.split("```python")
            if len(parts) > 1:
                code = parts[1].split("```")[0]
                return code.strip()
        elif "```" in text:
            parts = text.split("```")
            if len(parts) > 1:
                code = parts[1].split("```")[0]
                return code.strip()
        return text
