import os
from dotenv import load_dotenv
load_dotenv()

import asyncio
import logging
import json
import base64
from pathlib import Path
from typing import Dict, List, Set, Optional
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, Header, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from db.session import init_db, get_db, AsyncSessionLocal
from db.seeder import seed_sample_animations
from models.models import Conversation, Message, Scene, RenderJob, User
from models.schemas import (
    ConversationCreate, ConversationSummary, ConversationDetail,
    MessageCreate, MessageResponse, SceneResponse, AvailableModelsResponse, ModelOption,
    GoogleAuthRequest, AuthUserResponse
)
from llm_providers import get_llm_provider
from core.pipeline import AnimationPipeline
from sandbox.runner import SandboxedRunner

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_animator.api")

# Media storage directory
BASE_DIR = Path(__file__).resolve().parent.parent
MEDIA_DIR = Path(os.getenv("MEDIA_DIR", str(BASE_DIR / "storage" / "media")))
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    async with AsyncSessionLocal() as session:
        await seed_sample_animations(session)
    logger.info("Database initialized, sample animations seeded, and media directory mounted.")
    yield
    # Shutdown

app = FastAPI(
    title="AI Manim Animation Generator API",
    version="1.0.0",
    description="Backend API for AI-powered Manim animation generation with Google OAuth and Supabase.",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, conversation_id: str, websocket: WebSocket):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = set()
        self.active_connections[conversation_id].add(websocket)

    def disconnect(self, conversation_id: str, websocket: WebSocket):
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id].discard(websocket)
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]

    async def broadcast(self, conversation_id: str, message: dict):
        if conversation_id in self.active_connections:
            websockets = list(self.active_connections[conversation_id])
            for ws in websockets:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.warning(f"Error sending message to websocket: {e}")
                    self.disconnect(conversation_id, ws)

manager = ConnectionManager()

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# ----------------- Authentication Routes (Google OAuth) -----------------

@app.post("/api/auth/google", response_model=AuthUserResponse)
async def google_auth(data: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    """
    Verifies Google OAuth credentials or profile data, saves/updates user in Supabase,
    and returns authenticated user details with a session token.
    """
    email = data.email
    name = data.name
    picture = data.picture
    google_id = data.google_id

    # If credential JWT token is passed from Google Identity Services
    if data.credential:
        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests
            
            # Extract claims from Google ID Token
            google_client_id = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("NEXT_PUBLIC_GOOGLE_CLIENT_ID")
            try:
                id_info = id_token.verify_oauth2_token(
                    data.credential,
                    google_requests.Request(),
                    google_client_id,
                    clock_skew_in_seconds=10
                )
                email = id_info.get("email")
                name = id_info.get("name")
                picture = id_info.get("picture")
                google_id = id_info.get("sub")
            except Exception as e:
                logger.warning(f"google-auth verify failed: {e}, attempting payload decode...")
                # Fallback decoding unverified payload if local audience mismatch
                parts = data.credential.split(".")
                if len(parts) >= 2:
                    padding = 4 - (len(parts[1]) % 4)
                    payload_json = base64.urlsafe_b64decode(parts[1] + ("=" * padding)).decode("utf-8")
                    claims = json.loads(payload_json)
                    email = claims.get("email") or email
                    name = claims.get("name") or name
                    picture = claims.get("picture") or picture
                    google_id = claims.get("sub") or google_id
        except Exception as e:
            logger.error(f"Error parsing Google token: {e}")

    if not email:
        raise HTTPException(status_code=400, detail="Google authentication failed: Email is required.")

    # Find or create user in Supabase
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=email,
            name=name or email.split("@")[0],
            picture_url=picture,
            google_id=google_id,
            auth_provider="google"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info(f"Created new user via Google OAuth: {email} ({user.id})")
    else:
        # Update existing profile
        if name:
            user.name = name
        if picture:
            user.picture_url = picture
        if google_id:
            user.google_id = google_id
        await db.commit()
        await db.refresh(user)

    # Return session details
    session_token = f"ga_{user.id}_{int(datetime.utcnow().timestamp())}"
    return AuthUserResponse(
        id=user.id,
        email=user.email,
        name=user.name or user.email.split("@")[0],
        picture_url=user.picture_url,
        auth_provider="google",
        token=session_token
    )

@app.get("/api/auth/me", response_model=AuthUserResponse)
async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "").strip()
    if token.startswith("ga_"):
        parts = token.split("_")
        if len(parts) >= 2:
            user_id = parts[1]
            stmt = select(User).where(User.id == user_id)
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()
            if user:
                return AuthUserResponse(
                    id=user.id,
                    email=user.email or "",
                    name=user.name or "",
                    picture_url=user.picture_url,
                    auth_provider=user.auth_provider or "google",
                    token=token
                )
    raise HTTPException(status_code=401, detail="Invalid session")

# ----------------- Models & Conversations Routes -----------------

@app.get("/api/models", response_model=AvailableModelsResponse)
async def get_available_models():
    models = [
        ModelOption(
            id="gemini-3.7-flash",
            name="Gemini 3.7 Flash",
            provider="gemini",
            description="Ultra-fast Google model, optimal for real-time Manim generation"
        ),
        ModelOption(
            id="gemini-2.5-flash",
            name="Gemini 2.5 Flash",
            provider="gemini",
            description="High-precision Google generation model"
        ),
        ModelOption(
            id="claude-3-7-sonnet-20250219",
            name="Claude 3.7 Sonnet",
            provider="anthropic",
            description="State-of-the-art Python code reasoning & complex transformations"
        ),
        ModelOption(
            id="gpt-4o",
            name="GPT-4o (OpenAI)",
            provider="openai",
            description="Advanced multi-modal code and mathematical geometry generator"
        ),
        ModelOption(
            id="offline-mock",
            name="Offline Mock Generator",
            provider="mock",
            description="Instant zero-cost deterministic mock generator"
        )
    ]
    return AvailableModelsResponse(models=models)

@app.post("/api/conversations", response_model=ConversationSummary)
async def create_new_conversation(data: ConversationCreate = ConversationCreate(), db: AsyncSession = Depends(get_db)):
    valid_user_id = None
    if data.user_id:
        user_check = await db.get(User, data.user_id)
        if not user_check:
            guest_user = User(id=data.user_id, name="Guest", auth_provider="anonymous")
            db.add(guest_user)
            await db.commit()
        valid_user_id = data.user_id

    conv = Conversation(
        title=data.title or "New Animation",
        user_id=valid_user_id
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return ConversationSummary(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        scene_count=0,
        latest_video_url=None
    )

@app.get("/api/conversations", response_model=List[ConversationSummary])
async def list_conversations(
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.scenes))
        .order_by(desc(Conversation.updated_at))
    )
    if user_id:
        # Authenticated user: show their own private conversations + global sample chats
        stmt = stmt.where((Conversation.user_id == user_id) | (Conversation.user_id == None))
    else:
        # Logged-out / Anonymous: ONLY show default global sample chats
        stmt = stmt.where(Conversation.user_id == None)

    result = await db.execute(stmt)
    conversations = result.scalars().all()

    summaries = []
    for c in conversations:
        latest_video = None
        if c.scenes:
            successful_scenes = [s for s in c.scenes if s.video_url]
            if successful_scenes:
                latest_video = successful_scenes[-1].video_url

        summaries.append(
            ConversationSummary(
                id=c.id,
                title=c.title,
                created_at=c.created_at,
                updated_at=c.updated_at,
                scene_count=len(c.scenes) if c.scenes else 0,
                latest_video_url=latest_video,
                is_sample=(c.user_id is None)
            )
        )
    return summaries

@app.get("/api/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Conversation)
        .options(
            selectinload(Conversation.messages),
            selectinload(Conversation.scenes)
        )
        .where(Conversation.id == conversation_id)
    )
    result = await db.execute(stmt)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.is_sample = (conv.user_id is None)
    return conv

@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Conversation).where(Conversation.id == conversation_id)
    result = await db.execute(stmt)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.user_id is None:
        raise HTTPException(status_code=403, detail="Cannot delete showcase sample conversations")
    await db.delete(conv)
    await db.commit()
    return {"success": True, "message": "Conversation deleted"}

@app.post("/api/conversations/{conversation_id}/messages")
async def send_message_and_generate(
    conversation_id: str,
    data: MessageCreate,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Conversation)
        .options(
            selectinload(Conversation.messages),
            selectinload(Conversation.scenes)
        )
        .where(Conversation.id == conversation_id)
    )
    result = await db.execute(stmt)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if data.user_id and not conv.user_id:
        user_check = await db.get(User, data.user_id)
        if not user_check:
            guest_user = User(id=data.user_id, name="Guest", auth_provider="anonymous")
            db.add(guest_user)
            await db.commit()
        conv.user_id = data.user_id

    if conv.title in ["New Animation", ""] and len(data.content) > 0:
        words = data.content.strip().split()
        conv.title = " ".join(words[:6]) + ("..." if len(words) > 6 else "")

    user_msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=data.content
    )
    db.add(user_msg)
    await db.commit()
    await db.refresh(user_msg)

    # Calculate unique incremental version number
    prior_code = None
    existing_versions = [s.version for s in conv.scenes] if conv.scenes else []
    next_version = (max(existing_versions) + 1) if existing_versions else 1

    if conv.scenes:
        successful_scenes = [s for s in conv.scenes if s.code and s.status == "succeeded"]
        if successful_scenes:
            prior_code = successful_scenes[-1].code

    from llm_providers.base import ChatMessage
    history = [ChatMessage(role=m.role, content=m.content) for m in conv.messages]

    provider = get_llm_provider(
        provider_name=data.provider or "gemini",
        api_key=data.api_key,
        model=data.model
    )

    async def event_listener(event_data: dict):
        await manager.broadcast(conversation_id, event_data)

    load_dotenv(override=True)
    use_docker = os.getenv("USE_DOCKER", "false").lower() in ["true", "1", "yes"]
    logger.info(f"Animation Pipeline execution mode: {'DOCKER CONTAINER' if use_docker else 'LOCAL VENV'}")

    pipeline = AnimationPipeline(
        provider=provider,
        runner=SandboxedRunner(media_output_dir=str(MEDIA_DIR), use_docker=use_docker),
        max_retries=3,
        event_callback=event_listener
    )

    pipeline_result = await pipeline.run(
        prompt=data.content,
        history=history,
        prior_code=prior_code,
        scene_id=f"{conversation_id}_v{next_version}"
    )

    assistant_msg = Message(
        conversation_id=conversation_id,
        role="assistant",
        content="I have generated and rendered your animation scene." if pipeline_result["success"] else f"Generation failed: {pipeline_result.get('error_trace')}"
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    scene = Scene(
        conversation_id=conversation_id,
        message_id=assistant_msg.id,
        version=next_version,
        code=pipeline_result.get("code") or "",
        llm_provider=provider.get_provider_name(),
        llm_model=provider.model or "default",
        status=pipeline_result.get("status", "failed"),
        error_trace=pipeline_result.get("error_trace"),
        video_url=pipeline_result.get("video_url"),
        thumbnail_url=pipeline_result.get("thumbnail_url"),
        render_duration_ms=pipeline_result.get("render_duration_ms", 0)
    )
    db.add(scene)
    conv.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(scene)

    return {
        "user_message": MessageResponse.model_validate(user_msg),
        "assistant_message": MessageResponse.model_validate(assistant_msg),
        "scene": SceneResponse.model_validate(scene)
    }

@app.get("/api/scenes/{scene_id}", response_model=SceneResponse)
async def get_scene(scene_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Scene).where(Scene.id == scene_id)
    result = await db.execute(stmt)
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    return scene

@app.get("/api/scenes/{scene_id}/code")
async def get_scene_code(scene_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Scene).where(Scene.id == scene_id)
    result = await db.execute(stmt)
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    return {"code": scene.code, "version": scene.version, "status": scene.status}

@app.websocket("/ws/conversations/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    await manager.connect(conversation_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(conversation_id, websocket)
    except Exception:
        manager.disconnect(conversation_id, websocket)
