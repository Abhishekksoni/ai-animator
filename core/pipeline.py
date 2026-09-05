import asyncio
import logging
from typing import Optional, List, Callable, Dict, Any, Awaitable
from core.linter import ManimASTLinter
from sandbox.runner import SandboxedRunner, RenderResult
from llm_providers.base import CodeGenProvider, ChatMessage

logger = logging.getLogger("ai_animator.pipeline")

class PipelineEvent:
    GENERATING_CODE = "generating_code"
    CODE_GENERATED = "code_generated"
    LINTING = "linting"
    LINT_FAILED = "lint_failed"
    RENDERING = "rendering"
    RENDER_FAILED = "render_failed"
    AUTO_FIXING = "auto_fixing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"

class AnimationPipeline:
    """
    Coordinates code generation, AST static checks, sandboxed execution,
    and the self-correction feedback loop.
    """

    def __init__(
        self,
        provider: CodeGenProvider,
        runner: Optional[SandboxedRunner] = None,
        max_retries: int = 3,
        event_callback: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None
    ):
        self.provider = provider
        self.runner = runner or SandboxedRunner()
        self.max_retries = max_retries
        self.event_callback = event_callback

    async def _emit(self, event_type: str, data: Dict[str, Any]):
        if self.event_callback:
            try:
                payload = {"event": event_type, **data}
                if asyncio.iscoroutinefunction(self.event_callback):
                    await self.event_callback(payload)
                else:
                    self.event_callback(payload)
            except Exception as e:
                logger.warning(f"Error in event callback: {e}")

    async def run(
        self,
        prompt: str,
        history: Optional[List[ChatMessage]] = None,
        prior_code: Optional[str] = None,
        scene_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes the generation and self-correction loop.
        Returns final scene data dictionary.
        """
        scene_id = scene_id or f"scene_{int(asyncio.get_event_loop().time() * 1000)}"
        attempt = 1
        current_code = ""
        last_error = ""

        # Step 1: Initial Code Generation
        await self._emit(PipelineEvent.GENERATING_CODE, {
            "scene_id": scene_id,
            "attempt": attempt,
            "max_attempts": self.max_retries,
            "message": "Generating Manim animation code from prompt..."
        })

        try:
            current_code = await self.provider.generate_scene(
                prompt=prompt,
                history=history,
                prior_code=prior_code
            )
        except Exception as e:
            err_msg = f"LLM Generation failed: {str(e)}"
            await self._emit(PipelineEvent.FAILED, {
                "scene_id": scene_id,
                "error": err_msg
            })
            return {
                "success": False,
                "status": "failed",
                "code": current_code,
                "error_trace": err_msg,
                "attempts": attempt
            }

        await self._emit(PipelineEvent.CODE_GENERATED, {
            "scene_id": scene_id,
            "code": current_code,
            "attempt": attempt
        })

        # Self-correction loop
        while attempt <= self.max_retries:
            # Step 2: AST Static Validation & Security Check
            await self._emit(PipelineEvent.LINTING, {
                "scene_id": scene_id,
                "attempt": attempt,
                "message": f"Validating code structure (Attempt {attempt}/{self.max_retries})..."
            })

            is_valid, scene_class, lint_error = ManimASTLinter.validate_code(current_code)
            if not is_valid:
                last_error = f"Static Lint Failure: {lint_error}"
                await self._emit(PipelineEvent.LINT_FAILED, {
                    "scene_id": scene_id,
                    "attempt": attempt,
                    "error": last_error
                })

                if attempt == self.max_retries:
                    break

                # Self-correction trigger for lint error
                attempt += 1
                await self._emit(PipelineEvent.AUTO_FIXING, {
                    "scene_id": scene_id,
                    "attempt": attempt,
                    "message": f"Self-correcting code due to static validation failure (Attempt {attempt}/{self.max_retries})..."
                })
                try:
                    current_code = await self.provider.fix_error(
                        code=current_code,
                        error_trace=last_error,
                        original_prompt=prompt
                    )
                    await self._emit(PipelineEvent.CODE_GENERATED, {
                        "scene_id": scene_id,
                        "code": current_code,
                        "attempt": attempt
                    })
                except Exception as e:
                    last_error = f"Error during auto-fix: {str(e)}"
                    break
                continue

            # Step 3: Sandboxed Execution & Rendering
            await self._emit(PipelineEvent.RENDERING, {
                "scene_id": scene_id,
                "attempt": attempt,
                "scene_class": scene_class,
                "message": f"Rendering Manim video in isolated sandbox (Attempt {attempt}/{self.max_retries})..."
            })

            render_result: RenderResult = await self.runner.render_scene(
                code=current_code,
                scene_name=scene_class or "GenScene",
                job_id=f"{scene_id}_att{attempt}"
            )

            if render_result.success:
                # Success!
                await self._emit(PipelineEvent.SUCCEEDED, {
                    "scene_id": scene_id,
                    "video_url": render_result.video_path,
                    "thumbnail_url": render_result.thumbnail_path,
                    "duration_ms": render_result.duration_ms,
                    "attempt": attempt,
                    "code": current_code,
                    "message": "Animation rendered successfully!"
                })
                return {
                    "success": True,
                    "status": "succeeded",
                    "code": current_code,
                    "video_url": render_result.video_path,
                    "thumbnail_url": render_result.thumbnail_path,
                    "render_duration_ms": render_result.duration_ms,
                    "attempts": attempt,
                    "error_trace": None
                }
            else:
                # Execution failed
                last_error = render_result.error_trace or render_result.stderr or "Unknown render failure"
                await self._emit(PipelineEvent.RENDER_FAILED, {
                    "scene_id": scene_id,
                    "attempt": attempt,
                    "error_trace": last_error
                })

                if attempt == self.max_retries:
                    break

                # Self-correction trigger for runtime error
                attempt += 1
                await self._emit(PipelineEvent.AUTO_FIXING, {
                    "scene_id": scene_id,
                    "attempt": attempt,
                    "message": f"Self-correcting Manim runtime error with LLM (Attempt {attempt}/{self.max_retries})..."
                })
                try:
                    current_code = await self.provider.fix_error(
                        code=current_code,
                        error_trace=last_error,
                        original_prompt=prompt
                    )
                    await self._emit(PipelineEvent.CODE_GENERATED, {
                        "scene_id": scene_id,
                        "code": current_code,
                        "attempt": attempt
                    })
                except Exception as e:
                    last_error = f"Error during auto-fix: {str(e)}"
                    break

        # Max retries exhausted
        await self._emit(PipelineEvent.FAILED, {
            "scene_id": scene_id,
            "attempts": attempt,
            "error": last_error,
            "message": f"Rendering failed after {attempt} attempts."
        })

        return {
            "success": False,
            "status": "failed",
            "code": current_code,
            "video_url": None,
            "thumbnail_url": None,
            "render_duration_ms": 0,
            "attempts": attempt,
            "error_trace": last_error
        }
