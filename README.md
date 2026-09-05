# AI Manim Animation Studio

> Transform natural language prompts into high-quality mathematical & conceptual animations (3Blue1Brown-style) with automated self-correction, sandboxed execution, and an interactive chat workspace.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│              Next.js 14+ Frontend (React)              │
│  - Split-view studio: Conversational AI Director       │
│  - Interactive Video Player & Python Code Inspector    │
│  - Real-time WebSocket render progress stream          │
│  - Scene version history timeline (v1, v2, v3...)      │
│  - Multi-LLM switcher (Gemini, Claude, GPT-4o, Mock)   │
└───────────────────────────┬────────────────────────────┘
                            │ REST / WebSockets
┌───────────────────────────▼────────────────────────────┐
│                  FastAPI Backend (Python)              │
│  - Conversation & Scene Version Management             │
│  - Provider-Agnostic LLM Synthesis Engine              │
│  - Automated Self-Correction Loop with Feedback Retry  │
│  - Media Serving & Static Asset Caching                │
│  - Multi-tenant Ready Schema (SQLAlchemy + SQLite/PG)  │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
┌──────────────▼──────────────┐ ┌─────────▼──────────────┐
│     LLM Provider Layer      │ │ Sandboxed Render Engine │
│  - Google Gemini 2.0 Flash  │ │ - AST Safety Validator  │
│  - Anthropic Claude 3.7     │ │ - Docker / Local Runner │
│  - OpenAI GPT-4o            │ │ - stdout/stderr capture │
│  - Offline Mock Engine      │ │ - Multi-res MP4 export  │
└─────────────────────────────┘ └────────────────────────┘
```

---

## Key Features

1. **Self-Correction Feedback Loop (The Heart of the System)**:
   - When Manim generates code that triggers a runtime traceback (e.g. deprecation, LaTeX error, shape dimension mismatch), the system captures the clean stack trace and feeds it back into the LLM with a targeted auto-fix prompt (up to 3 automatic self-correction attempts).

2. **AST Static Safety Linter**:
   - Inspects generated Python Abstract Syntax Tree (AST) before execution.
   - Blocks dangerous imports (`os`, `sys`, `subprocess`, `socket`, `urllib`) and malicious calls (`eval`, `exec`, `open`, `__import__`).
   - Ensures valid `class GenScene(Scene):` inheritance and `construct(self)` definition.

3. **Provider-Agnostic Abstraction Layer**:
   - Seamlessly switch between Gemini 2.0 Flash, Claude 3.7 Sonnet, GPT-4o, or the Zero-Cost Offline Mock Engine.
   - Configure keys via `.env` or directly through the UI Key Modal.

4. **Conversational Iteration & Scene Versioning**:
   - Easily modify scenes ("make the square gold", "slow down the morphing", "add derivative equation").
   - Previous scene code is automatically provided as context for consecutive versions.
   - Version history ribbon allows jumping back and forth across scene iterations.

---

## Quickstart

### 1. Backend Setup

```bash
# Activate virtual environment
source venv/bin/activate

# Start FastAPI server with live reload
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be running at `http://localhost:8000`.
- API Docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/api/health`

### 2. Frontend Setup

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Running the Automated Test Suite

```bash
source venv/bin/activate
PYTHONPATH=. pytest -v tests/
```

All 8 integration and unit tests run in ~5 seconds, verifying:
- AST linter security checks
- LLM Provider factory
- Pipeline self-correction rendering
- FastAPI REST CRUD and WebSocket endpoints.
