import pytest
import asyncio
from core.linter import ManimASTLinter
from llm_providers import get_llm_provider
from llm_providers.mock_provider import MockProvider
from core.pipeline import AnimationPipeline, PipelineEvent
from sandbox.runner import SandboxedRunner

def test_ast_linter_valid():
    code = """from manim import *
class GenScene(Scene):
    def construct(self):
        c = Circle()
        self.play(Create(c))
"""
    is_valid, scene_class, err = ManimASTLinter.validate_code(code)
    assert is_valid is True
    assert scene_class == "GenScene"
    assert err is None

def test_ast_linter_security_block():
    bad_code = """from manim import *
import os
class GenScene(Scene):
    def construct(self):
        os.system("ls")
"""
    is_valid, scene_class, err = ManimASTLinter.validate_code(bad_code)
    assert is_valid is False
    assert "Forbidden module import 'os'" in err

def test_ast_linter_no_construct():
    bad_code = """from manim import *
class GenScene(Scene):
    pass
"""
    is_valid, scene_class, err = ManimASTLinter.validate_code(bad_code)
    assert is_valid is False
    assert "No class inheriting from Scene with a construct(self) method" in err

@pytest.mark.asyncio
async def test_mock_provider():
    provider = get_llm_provider("mock")
    assert isinstance(provider, MockProvider)
    
    code = await provider.generate_scene(prompt="Explain Pythagorean Theorem")
    assert "class GenScene(Scene):" in code
    assert "Pythagorean Theorem" in code

@pytest.mark.asyncio
async def test_pipeline_execution():
    events_received = []
    
    async def capture_event(data):
        events_received.append(data.get("event"))

    provider = MockProvider()
    pipeline = AnimationPipeline(
        provider=provider,
        max_retries=2,
        event_callback=capture_event
    )

    result = await pipeline.run(
        prompt="Show geometric morphing circle to square",
        scene_id="test_scene_1"
    )

    assert result["success"] is True
    assert result["video_url"] is not None
    assert PipelineEvent.GENERATING_CODE in events_received
    assert PipelineEvent.LINTING in events_received
    assert PipelineEvent.SUCCEEDED in events_received
