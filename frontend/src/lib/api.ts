import { ConversationSummary, ConversationDetail, ModelOption, Scene, AuthUser } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function loginWithGoogle(payload: {
  credential?: string;
  email?: string;
  name?: string;
  picture?: string;
  google_id?: string;
}): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Google sign-in failed');
  }
  return await res.json();
}

export async function fetchCurrentUser(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function fetchModels(): Promise<ModelOption[]> {
  try {
    const res = await fetch(`${API_BASE}/api/models`);
    if (!res.ok) throw new Error('Failed to fetch models');
    const data = await res.json();
    return data.models || [];
  } catch (err) {
    console.error('Error fetching models:', err);
    return [];
  }
}

export async function fetchConversations(userId?: string): Promise<ConversationSummary[]> {
  try {
    const url = userId ? `${API_BASE}/api/conversations?user_id=${userId}` : `${API_BASE}/api/conversations`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return await res.json();
  } catch (err) {
    console.error('Error fetching conversations:', err);
    return [];
  }
}

export async function createConversation(title?: string, userId?: string): Promise<ConversationSummary> {
  const res = await fetch(`${API_BASE}/api/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: title || 'New Animation',
      user_id: userId || undefined,
    }),
  });
  if (!res.ok) throw new Error('Failed to create conversation');
  return await res.json();
}

export async function fetchConversation(id: string): Promise<ConversationDetail> {
  const res = await fetch(`${API_BASE}/api/conversations/${id}`);
  if (!res.ok) throw new Error('Failed to fetch conversation');
  return await res.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/conversations/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete conversation');
}

export async function sendMessage(
  conversationId: string,
  content: string,
  provider: string = 'gemini',
  model?: string,
  apiKey?: string,
  userId?: string
): Promise<{ user_message: any; assistant_message: any; scene: Scene }> {
  const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      provider,
      model,
      api_key: apiKey || undefined,
      user_id: userId || undefined,
    }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to send message');
  }
  return await res.json();
}

export function createWebSocket(conversationId: string, onMessage: (event: any) => void): WebSocket {
  const wsUrl = (API_BASE.replace(/^http/, 'ws')) + `/ws/conversations/${conversationId}`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
    }
  };

  return ws;
}
