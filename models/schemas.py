from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None  # Google JWT ID token
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    google_id: Optional[str] = None

class AuthUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: Optional[str] = None
    picture_url: Optional[str] = None
    auth_provider: str = "google"
    token: Optional[str] = None

class MessageCreate(BaseModel):
    content: str
    provider: Optional[str] = "gemini"  # openai, anthropic, gemini, mock
    model: Optional[str] = None
    api_key: Optional[str] = None
    user_id: Optional[str] = None

class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    role: str
    content: str
    created_at: datetime

class SceneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    message_id: Optional[str] = None
    version: int
    code: str
    llm_provider: str
    llm_model: str
    status: str
    error_trace: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    render_duration_ms: int
    created_at: datetime

class ConversationCreate(BaseModel):
    title: Optional[str] = "New Animation"
    user_id: Optional[str] = None

class ConversationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    scene_count: int = 0
    latest_video_url: Optional[str] = None

class ConversationDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []
    scenes: List[SceneResponse] = []

class RenderJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    scene_id: str
    status: str
    attempt_number: int
    started_at: datetime
    finished_at: Optional[datetime] = None

class ModelOption(BaseModel):
    id: str
    name: str
    provider: str
    description: str

class AvailableModelsResponse(BaseModel):
    models: List[ModelOption]
