# AI Manim Animation Generator — Implementation Plan

Build a production-grade, extensible AI-powered Manim Animation Generator that transforms natural language prompts into rendered mathematical/conceptual videos with automated self-correction, sandboxed execution, and an interactive chat interface.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                   Next.js Frontend                     │
│  - Split-view chat + video player & code inspector     │
│  - Real-time WebSocket/SSE render progress stream       │
│  - Model/provider switcher & scene version history     │
└───────────────────────────┬────────────────────────────┘
                            │ REST / WebSocket
┌───────────────────────────▼────────────────────────────┐
│                    FastAPI Backend                     │
│  - Conversation & Scene Management                     │
│  - Provider-agnostic LLM code generator & error fixer  │
│  - Async worker orchestration & media serving          │
│  - Multi-tenant ready database schema (SQLAlchemy)     │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
┌──────────────▼──────────────┐ ┌─────────▼──────────────┐
│  LLM Provider Layer         │ │ Sandboxed Render Engine │
│  - OpenAI / Anthropic /     │ │ - AST & static linter  │
│    Gemini integrations      │ │ - Docker containerized │
│  - Manim v0.18+ RAG &       │ │   Manim execution      │
│    curated few-shots        │ │ - Output & error log   │
│  - Iterative auto-fix loop  │ │   capture harness      │
└─────────────────────────────┘ └────────────────────────┘
```

---

## User Review Required

> [!IMPORTANT]
> **LLM API Keys**: The system will support environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`) as well as user-configurable keys directly in the frontend UI settings modal for flexible testing.
>
> **Sandboxed Execution Strategy**:
> - Primary: Isolated Docker container (`manimcommunity/manim:stable`) with non-root user, no network access, memory limit (2GB), CPU quota (2 cores), and 90s timeout.
> - Fallback: Local runner option with strict AST parsing for environments without active Docker daemon.

---

## Proposed Changes

### 1. LLM Provider Layer & Prompts (`/llm_providers`, `/prompts`)

#### [NEW] [base.py](file:///Users/abhisheksoni/ai-animator/llm_providers/base.py)
- Defines abstract base class `CodeGenProvider`:
  - `generate_scene(prompt: str, history: list[Message], prior_code: str | None) -> str`
  - `fix_error(code: str, error_trace: str, original_prompt: str) -> str`
  - `get_model_info() -> dict`

#### [NEW] [openai_provider.py](file:///Users/abhisheksoni/ai-animator/llm_providers/openai_provider.py)
- OpenAI provider implementation (`gpt-4o`, `gpt-4o-mini`, `o3-mini`).

#### [NEW] [anthropic_provider.py](file:///Users/abhisheksoni/ai-animator/llm_providers/anthropic_provider.py)
- Anthropic provider implementation (`claude-3-7-sonnet`, `claude-3-5-sonnet`).

#### [NEW] [gemini_provider.py](file:///Users/abhisheksoni/ai-animator/llm_providers/gemini_provider.py)
- Google Gemini provider implementation (`gemini-2.0-flash`, `gemini-1.5-pro`).

#### [NEW] [system_prompts.py](file:///Users/abhisheksoni/ai-animator/prompts/system_prompts.py)
- Curated Manim Community edition (v0.18+) API guidelines, layout best practices, color palette rules (dark 3Blue1Brown aesthetics), avoiding common deprecated methods (`ShowCreation` -> `Create`, `TransformFromCopy`, etc.).
- Golden few-shot examples (coordinate systems, 2D/3D geometry, LaTeX equations, graph transformations, text narration alignments).

---

### 2. Sandboxed Render Engine & Static Linter (`/sandbox`, `/core`)

#### [NEW] [linter.py](file:///Users/abhisheksoni/ai-animator/core/linter.py)
- AST-based code validation before execution:
  - Disallows unsafe imports (`os`, `sys`, `subprocess`, `socket`, `shutil`, `urllib`, `requests`, `builtins.eval`, `builtins.exec`).
  - Ensures a subclass of `Scene` (e.g. `ThreeDScene`, `MovingCameraScene`, `Scene`) is defined and contains a `construct()` method.
  - Extracts the generated Scene class name dynamically.

#### [NEW] [Dockerfile](file:///Users/abhisheksoni/ai-animator/sandbox/Dockerfile)
- Minimal Manim execution container based on `manimcommunity/manim:latest` or lean Debian + TeXLive-core + ffmpeg.
- Non-root user `manimuser`, read-only rootfs, dedicated `/workspace/output` volume.

#### [NEW] [runner.py](file:///Users/abhisheksoni/ai-animator/sandbox/runner.py)
- Sandboxed execution harness:
  - Handles Docker container execution with `--network none`, `--memory 2048m`, `--cpus 2.0`, and timeout enforcement (90s).
  - Captures stdout, stderr, exit codes, and renders output video/thumbnail.
  - Formats tracebacks into concise, clean error snippets specifically structured for the LLM auto-fix loop.

---

### 3. Orchestration & Self-Correction Pipeline (`/core`, `/workers`)

#### [NEW] [pipeline.py](file:///Users/abhisheksoni/ai-animator/core/pipeline.py)
- Manages the core loop:
  1. Generate code from prompt + history + prior version.
  2. Run AST static validation.
  3. Execute render in sandbox.
  4. If execution fails: loop back to `provider.fix_error()` with error trace and retry (up to max attempts, default 3).
  5. Broadcast progress events via WebSocket (`status_update`, `code_generated`, `attempt_failed`, `render_succeeded`).
  6. Save scene record, generated code snapshot, error traces, and media file references.

---

### 4. Backend API & Database (`/api`, `/models`, `/db`)

#### [NEW] [schema.py](file:///Users/abhisheksoni/ai-animator/models/schemas.py) & [models.py](file:///Users/abhisheksoni/ai-animator/models/models.py)
- SQLAlchemy models with SQLite/Postgres compatibility:
  - `User` (id, email, organization_id)
  - `Organization` (multi-tenant ready)
  - `Conversation` (id, title, user_id, organization_id, created_at, updated_at)
  - `Message` (id, conversation_id, role, content, created_at)
  - `Scene` (id, conversation_id, message_id, version, code, llm_provider, llm_model, status, error_trace, video_url, thumbnail_url, render_duration_ms, created_at)
  - `RenderJob` (id, scene_id, status, started_at, finished_at, attempt_number)

#### [NEW] [main.py](file:///Users/abhisheksoni/ai-animator/api/main.py)
- FastAPI application with REST endpoints:
  - `POST /api/conversations` (create conversation)
  - `GET /api/conversations` (list conversations)
  - `GET /api/conversations/{id}` (fetch conversation + messages + scenes)
  - `DELETE /api/conversations/{id}` (delete conversation)
  - `POST /api/conversations/{id}/messages` (send prompt, starts generation/render task)
  - `GET /api/scenes/{id}` (fetch scene status & media)
  - `GET /api/scenes/{id}/code` (fetch generated scene code)
  - `WS /ws/conversations/{id}` (real-time progress event streaming)
  - `StaticFiles` mount for rendered videos and assets (`/media/...`)

---

### 5. Frontend Web Application (`/frontend`)

#### [NEW] Next.js 14+ App with Modern UI
- **Design & Layout**:
  - Sleek dark mode palette (obsidian/slate background, neon/cyan accents, smooth glassmorphic panels).
  - Left Panel:
    - Interactive Chat conversation with auto-scrolling, formatted prompts, model badges.
    - Real-time animated pipeline indicator (`Generating Code...` -> `Linting...` -> `Rendering Scene (Attempt 1/3)...` -> `Complete!`).
    - Error traceback drawer for transparency when self-correction is triggered.
  - Right Panel:
    - High-performance HTML5 Video Player with playback rate, loop, seek bar, time display, full-screen, and MP4 download button.
    - Code Inspector tab with syntax highlighting, copy-to-clipboard, and line numbers.
    - Scene Version Carousel / Selector (switch between iterative iterations: v1, v2, v3).
  - Top Navigation:
    - Model & Provider selector (OpenAI / Claude / Gemini).
    - API Key Config Modal (for custom provider keys).
    - Quick Templates ("Pythagorean Theorem", "Fourier Series", "Neural Network", "Sorting Algorithm").

---

## Verification Plan

### Automated Tests
- LLM Provider Interface Unit Tests (mocked responses, prompt formatting).
- AST Linter Security Tests (ensure malicious calls like `__import__('os').system('...')` are rejected).
- Pipeline Error-Correction Unit Tests (simulate syntax error -> verify self-correction retry trigger).
- FastAPI Endpoint Tests (CRUD conversations, message creation, WebSocket connection).

### End-to-End Verification
1. Start backend (`uvicorn api.main:app`) and frontend (`npm run dev`).
2. Run a full prompt generation test: "Create an animation showing a circle transforming into a square with LaTeX formula $r^2 \pi$".
3. Trigger an iterative edit: "Change the square color to vibrant gold and slow down the morphing".
4. Validate video render quality, real-time WebSocket events, version history switching, and code viewing.
