export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  picture_url?: string;
  auth_provider: string;
  token?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface Scene {
  id: string;
  conversation_id: string;
  message_id?: string;
  version: number;
  code: string;
  llm_provider: string;
  llm_model: string;
  status: 'pending' | 'generating' | 'rendering' | 'succeeded' | 'failed';
  error_trace?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  render_duration_ms: number;
  created_at: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  scene_count: number;
  latest_video_url?: string | null;
  is_sample?: boolean;
}

export interface ConversationDetail {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_sample?: boolean;
  messages: Message[];
  scenes: Scene[];
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export interface PipelineProgressEvent {
  event: 'generating_code' | 'code_generated' | 'linting' | 'lint_failed' | 'rendering' | 'render_failed' | 'auto_fixing' | 'succeeded' | 'failed';
  scene_id?: string;
  attempt?: number;
  max_attempts?: number;
  code?: string;
  video_url?: string;
  thumbnail_url?: string;
  error?: string;
  error_trace?: string;
  message?: string;
  duration_ms?: number;
}
