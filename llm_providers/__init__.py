from typing import Optional
from llm_providers.base import CodeGenProvider, ChatMessage
from llm_providers.openai_provider import OpenAIProvider
from llm_providers.anthropic_provider import AnthropicProvider
from llm_providers.gemini_provider import GeminiProvider
from llm_providers.mock_provider import MockProvider

def get_llm_provider(
    provider_name: str,
    api_key: Optional[str] = None,
    model: Optional[str] = None
) -> CodeGenProvider:
    """
    Factory function to instantiate the requested LLM provider.
    Supported: 'openai', 'anthropic', 'gemini', 'mock'
    """
    name = (provider_name or "").lower().strip()
    if name == "openai":
        return OpenAIProvider(api_key=api_key, model=model)
    elif name in ["anthropic", "claude"]:
        return AnthropicProvider(api_key=api_key, model=model)
    elif name in ["gemini", "google"]:
        return GeminiProvider(api_key=api_key, model=model)
    elif name == "mock":
        return MockProvider(api_key=api_key, model=model)
    else:
        # Default fallback to Gemini or OpenAI if keys exist, else mock
        if api_key:
            if "sk-ant" in api_key:
                return AnthropicProvider(api_key=api_key, model=model)
            elif "sk-" in api_key:
                return OpenAIProvider(api_key=api_key, model=model)
            elif "AIza" in api_key:
                return GeminiProvider(api_key=api_key, model=model)
        return MockProvider(api_key=api_key, model=model)

__all__ = [
    "CodeGenProvider",
    "ChatMessage",
    "OpenAIProvider",
    "AnthropicProvider",
    "GeminiProvider",
    "MockProvider",
    "get_llm_provider"
]
