import asyncio
import os
import shutil
import tempfile
import time
import logging
from pathlib import Path
from typing import Optional, Dict, Any

logger = logging.getLogger("ai_animator.sandbox")

class RenderResult:
    def __init__(
        self,
        success: bool,
        video_path: Optional[str] = None,
        thumbnail_path: Optional[str] = None,
        duration_ms: int = 0,
        stdout: str = "",
        stderr: str = "",
        error_trace: Optional[str] = None
    ):
        self.success = success
        self.video_path = video_path
        self.thumbnail_path = thumbnail_path
        self.duration_ms = duration_ms
        self.stdout = stdout
        self.stderr = stderr
        self.error_trace = error_trace

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "video_path": self.video_path,
            "thumbnail_path": self.thumbnail_path,
            "duration_ms": self.duration_ms,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "error_trace": self.error_trace
        }

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_MEDIA_DIR = os.getenv("MEDIA_DIR", str(BASE_DIR / "storage" / "media"))

class SandboxedRunner:
    """
    Executes Manim rendering inside an isolated environment (Docker container or local sandbox),
    captures outputs/errors, and exports the final MP4.
    """

    def __init__(
        self,
        media_output_dir: Optional[str] = None,
        use_docker: bool = False,
        timeout_seconds: int = 90
    ):
        self.media_output_dir = Path(media_output_dir or DEFAULT_MEDIA_DIR)
        self.media_output_dir.mkdir(parents=True, exist_ok=True)
        self.use_docker = use_docker
        self.timeout_seconds = timeout_seconds

    async def render_scene(
        self,
        code: str,
        scene_name: str = "GenScene",
        quality: str = "l",  # 'l' (480p), 'm' (720p), 'h' (1080p)
        job_id: Optional[str] = None
    ) -> RenderResult:
        start_time = time.time()
        job_id = job_id or f"render_{int(start_time * 1000)}"

        # Create temporary working directory for this run
        temp_dir = Path(tempfile.mkdtemp(prefix=f"manim_{job_id}_"))
        script_path = temp_dir / "scene.py"
        script_path.write_text(code, encoding="utf-8")

        logger.info(f"Rendering scene '{scene_name}' in {'DOCKER SANDBOX' if self.use_docker else 'LOCAL VENV'} (quality={quality}, job_id={job_id})...")

        try:
            if self.use_docker:
                result = await self._render_docker(temp_dir, script_path, scene_name, quality, job_id)
            else:
                result = await self._render_local(temp_dir, script_path, scene_name, quality, job_id)

            duration_ms = int((time.time() - start_time) * 1000)
            result.duration_ms = duration_ms
            return result
        finally:
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception:
                pass

    async def _render_local(
        self,
        temp_dir: Path,
        script_path: Path,
        scene_name: str,
        quality: str,
        job_id: str
    ) -> RenderResult:
        venv_bin_dir = str(BASE_DIR / "venv" / "bin")
        venv_manim = f"{venv_bin_dir}/manim"
        manim_bin = shutil.which("manim") or (venv_manim if os.path.exists(venv_manim) else "manim")

        env = dict(os.environ)
        if os.path.exists(venv_bin_dir):
            env["PATH"] = f"{venv_bin_dir}:{env.get('PATH', '')}"

        cmd = [
            manim_bin,
            "render",
            f"-q{quality}",
            "--media_dir", str(temp_dir / "media"),
            str(script_path),
            scene_name
        ]

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(temp_dir),
                env=env
            )

            try:
                stdout_data, stderr_data = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=self.timeout_seconds
                )
            except asyncio.TimeoutError:
                try:
                    proc.kill()
                except Exception:
                    pass
                return RenderResult(
                    success=False,
                    error_trace=f"Render timed out after {self.timeout_seconds} seconds.",
                    stderr=f"TimeoutError: Execution exceeded {self.timeout_seconds}s limit."
                )

            stdout = stdout_data.decode("utf-8", errors="replace")
            stderr = stderr_data.decode("utf-8", errors="replace")

            if proc.returncode != 0:
                error_trace = self._extract_clean_traceback(stdout, stderr)
                return RenderResult(
                    success=False,
                    stdout=stdout,
                    stderr=stderr,
                    error_trace=error_trace
                )

            # Find generated video file
            mp4_files = list(temp_dir.glob("media/videos/**/*.mp4"))
            if not mp4_files:
                return RenderResult(
                    success=False,
                    stdout=stdout,
                    stderr=stderr,
                    error_trace="Manim executed successfully but no output .mp4 video file was generated."
                )

            # Copy to persistent storage
            dest_video = self.media_output_dir / f"{job_id}.mp4"
            shutil.copy2(mp4_files[0], dest_video)

            # Create thumbnail frame if ffmpeg exists
            dest_thumb = self.media_output_dir / f"{job_id}.png"
            await self._generate_thumbnail(dest_video, dest_thumb, env)

            return RenderResult(
                success=True,
                video_path=f"/media/{job_id}.mp4",
                thumbnail_path=f"/media/{job_id}.png" if dest_thumb.exists() else None,
                stdout=stdout,
                stderr=stderr
            )

        except Exception as e:
            return RenderResult(
                success=False,
                error_trace=f"Execution error: {str(e)}"
            )

    async def _render_docker(
        self,
        temp_dir: Path,
        script_path: Path,
        scene_name: str,
        quality: str,
        job_id: str
    ) -> RenderResult:
        cmd = [
            "docker", "run", "--rm",
            "--network", "none",
            "--memory", "2048m",
            "--cpus", "2.0",
            "-v", f"{temp_dir}:/workspace",
            "-w", "/workspace",
            "-u", "0:0",
            "manimcommunity/manim:latest",
            "manim",
            "render",
            f"-q{quality}",
            "--media_dir", "/workspace/media",
            "/workspace/scene.py",
            scene_name
        ]

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            try:
                stdout_data, stderr_data = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=self.timeout_seconds
                )
            except asyncio.TimeoutError:
                try:
                    proc.kill()
                except Exception:
                    pass
                return RenderResult(
                    success=False,
                    error_trace=f"Docker container render timed out after {self.timeout_seconds} seconds."
                )

            stdout = stdout_data.decode("utf-8", errors="replace")
            stderr = stderr_data.decode("utf-8", errors="replace")

            if proc.returncode != 0:
                error_trace = self._extract_clean_traceback(stdout, stderr)
                return RenderResult(
                    success=False,
                    stdout=stdout,
                    stderr=stderr,
                    error_trace=error_trace
                )

            mp4_files = list(temp_dir.glob("media/videos/**/*.mp4"))
            if not mp4_files:
                return RenderResult(
                    success=False,
                    stdout=stdout,
                    stderr=stderr,
                    error_trace="Docker render finished but no .mp4 output was found."
                )

            dest_video = self.media_output_dir / f"{job_id}.mp4"
            shutil.copy2(mp4_files[0], dest_video)

            dest_thumb = self.media_output_dir / f"{job_id}.png"
            await self._generate_thumbnail(dest_video, dest_thumb, os.environ)

            return RenderResult(
                success=True,
                video_path=f"/media/{job_id}.mp4",
                thumbnail_path=f"/media/{job_id}.png" if dest_thumb.exists() else None,
                stdout=stdout,
                stderr=stderr
            )

        except Exception as e:
            return RenderResult(
                success=False,
                error_trace=f"Docker execution exception: {str(e)}"
            )

    async def _generate_thumbnail(self, video_path: Path, thumbnail_path: Path, env: dict):
        try:
            venv_bin_dir = str(BASE_DIR / "venv" / "bin")
            venv_ffmpeg = f"{venv_bin_dir}/ffmpeg"
            ffmpeg_bin = shutil.which("ffmpeg") or (venv_ffmpeg if os.path.exists(venv_ffmpeg) else "ffmpeg")

            ffmpeg_cmd = [
                ffmpeg_bin, "-y", "-ss", "00:00:00.5",
                "-i", str(video_path),
                "-vframes", "1",
                "-q:v", "2",
                str(thumbnail_path)
            ]
            proc = await asyncio.create_subprocess_exec(
                *ffmpeg_cmd,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
                env=env
            )
            await asyncio.wait_for(proc.communicate(), timeout=5)
        except Exception:
            pass

    def _extract_clean_traceback(self, stdout: str, stderr: str) -> str:
        combined = f"{stderr}\n{stdout}".strip()
        lines = combined.split("\n")
        
        trace_lines = []
        capture = False
        for line in lines:
            if "Traceback (most recent call last):" in line or "Error:" in line or "Exception:" in line:
                capture = True
            if capture:
                trace_lines.append(line)

        if trace_lines:
            return "\n".join(trace_lines[-25:])
        return combined[-1000:] if len(combined) > 1000 else combined
