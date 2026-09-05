'use client';

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  ConversationSummary, ConversationDetail, ModelOption,
  Scene, PipelineProgressEvent, AuthUser
} from '../types';
import {
  fetchModels, fetchConversations, createConversation,
  fetchConversation, deleteConversation, sendMessage, createWebSocket,
  fetchCurrentUser
} from '../lib/api';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { ChatPanel } from '../components/ChatPanel';
import { CanvasArtifact } from '../components/CanvasArtifact';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { GoogleAuthModal } from '../components/GoogleAuthModal';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('gemini-3.7-flash');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  // Claude Artifact / Canvas open state
  const [isArtifactOpen, setIsArtifactOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressEvent, setProgressEvent] = useState<PipelineProgressEvent | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);

  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const convCacheRef = useRef<Record<string, ConversationDetail>>({});

  // Load user session, theme and preferences on mount
  useEffect(() => {
    // Responsive sidebar initial state
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }

    const savedTheme = localStorage.getItem('manim_ai_theme') as 'dark' | 'light' | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      document.documentElement.classList.add('dark');
    }

    const savedUserStr = localStorage.getItem('manim_ai_user');
    let initialUser: AuthUser | null = null;
    if (savedUserStr) {
      try {
        initialUser = JSON.parse(savedUserStr);
        setUser(initialUser);
        if (initialUser?.token) {
          fetchCurrentUser(initialUser.token).then((fresh) => {
            if (fresh) setUser(fresh);
          });
        }
      } catch (e) {}
    }

    async function init() {
      try {
        const modelList = await fetchModels();
        setModels(modelList);
      } catch (e) {
        console.error('Failed to fetch models:', e);
      }

      const savedKeys = localStorage.getItem('manim_ai_keys');
      if (savedKeys) {
        try {
          setApiKeys(JSON.parse(savedKeys));
        } catch (e) {}
      }

      const convList = await fetchConversations(initialUser?.id);
      setConversations(convList);

      if (convList.length > 0) {
        loadConversation(convList[0].id);
      } else {
        handleNewConversation();
      }
    }
    init();
  }, []);

  // Reload user-scoped conversations when user state changes
  useEffect(() => {
    if (user?.id) {
      fetchConversations(user.id).then((convList) => {
        setConversations(convList);
      });
    }
  }, [user?.id]);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('manim_ai_theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  const handleAuthSuccess = async (authUser: AuthUser) => {
    setUser(authUser);
    localStorage.setItem('manim_ai_user', JSON.stringify(authUser));
    try {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
    } catch (e) {}

    const convList = await fetchConversations(authUser.id);
    setConversations(convList);

    // If user was trying to send a prompt before logging in, auto-dispatch it
    if (pendingPrompt) {
      const promptToRun = pendingPrompt;
      setPendingPrompt(null);
      setTimeout(() => {
        handleSendMessage(promptToRun, authUser.id);
      }, 300);
    }
  };

  const handleSignOut = async () => {
    setUser(null);
    localStorage.removeItem('manim_ai_user');
    const convList = await fetchConversations();
    setConversations(convList);
    if (convList.length > 0) {
      loadConversation(convList[0].id);
    } else {
      handleNewConversation();
    }
  };

  const handleRequireAuth = (promptText?: string) => {
    if (promptText) {
      setPendingPrompt(promptText);
    }
    setIsAuthModalOpen(true);
  };

  // Re-sync active conversation state
  const syncConversationState = (detail: ConversationDetail) => {
    setActiveConversation(detail);
    convCacheRef.current[detail.id] = detail;

    if (detail.scenes && detail.scenes.length > 0) {
      const successful = detail.scenes.filter((s) => s.status === 'succeeded' && s.video_url);
      if (successful.length > 0) {
        setSelectedSceneId(successful[successful.length - 1].id);
        setIsArtifactOpen(true);
      } else {
        setSelectedSceneId(detail.scenes[detail.scenes.length - 1].id);
      }
    } else {
      setSelectedSceneId(null);
      setIsArtifactOpen(false);
    }
    setProgressEvent(null);
  };

  // Subscribe to WebSocket for active conversation
  useEffect(() => {
    if (!activeConversation?.id) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = createWebSocket(activeConversation.id, (data: PipelineProgressEvent) => {
      setProgressEvent(data);
      if (data.event === 'succeeded') {
        setIsArtifactOpen(true);
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        } catch (e) {}
      }
    });

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [activeConversation?.id]);

  const loadConversation = async (id: string) => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    // 1. Instant Cache hit (0ms UI latency)
    if (convCacheRef.current[id]) {
      syncConversationState(convCacheRef.current[id]);
    }

    // 2. Fetch fresh background update
    try {
      const detail = await fetchConversation(id);
      syncConversationState(detail);
    } catch (e) {
      console.error('Failed to load conversation:', e);
    }
  };

  const handleNewConversation = async () => {
    try {
      // Create on backend
      const newConv = await createConversation('New Animation', user?.id);
      
      // Optimistically update list without redundant extra fetch
      setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
      
      // Create empty conversation state instantly (0ms lag)
      const freshDetail: ConversationDetail = {
        id: newConv.id,
        title: newConv.title,
        created_at: newConv.created_at,
        updated_at: newConv.updated_at,
        messages: [],
        scenes: []
      };
      
      syncConversationState(freshDetail);
    } catch (e) {
      console.error('Failed to create new conversation:', e);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetConv = conversations.find((c) => c.id === id);
    if (targetConv?.is_sample) {
      return; // Showcase sample animations are permanent and protected
    }
    try {
      delete convCacheRef.current[id];
      setConversations((prev) => prev.filter((c) => c.id !== id));
      
      await deleteConversation(id);
      
      if (activeConversation?.id === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        if (remaining.length > 0) {
          loadConversation(remaining[0].id);
        } else {
          handleNewConversation();
        }
      }
    } catch (e) {
      console.error('Failed to delete conversation:', e);
    }
  };

  const handleSendMessage = async (content: string, explicitUserId?: string) => {
    if (!activeConversation) return;

    // Generation gating: must be logged in
    const activeUserId = explicitUserId || user?.id;
    if (!activeUserId) {
      handleRequireAuth(content);
      return;
    }

    setIsLoading(true);
    setProgressEvent({ event: 'generating_code', message: 'Starting animation generation...' });

    const selectedModel = models.find((m) => m.id === selectedModelId);
    const providerName = selectedModel?.provider || 'gemini';
    const activeKey = apiKeys[providerName];

    try {
      const response = await sendMessage(
        activeConversation.id,
        content,
        providerName,
        selectedModelId,
        activeKey,
        activeUserId
      );

      // Refresh conversation
      const detail = await fetchConversation(activeConversation.id);
      setActiveConversation(detail);
      
      if (response.scene) {
        setSelectedSceneId(response.scene.id);
        if (response.scene.status === 'succeeded') {
          setIsArtifactOpen(true);
        }
      } else if (detail.scenes && detail.scenes.length > 0) {
        setSelectedSceneId(detail.scenes[detail.scenes.length - 1].id);
      }

      // Update sidebar summaries
      const convList = await fetchConversations(activeUserId);
      setConversations(convList);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setProgressEvent({
        event: 'failed',
        error: err.message || 'Failed to render animation'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveKeys = (keys: Record<string, string>) => {
    setApiKeys(keys);
    localStorage.setItem('manim_ai_keys', JSON.stringify(keys));
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModelId(modelId);
    localStorage.setItem('manim_ai_model', modelId);
  };

  const activeScene: Scene | null =
    (selectedSceneId && activeConversation?.scenes?.find((s) => s.id === selectedSceneId)) ||
    (activeConversation?.scenes?.filter((s) => s.status === 'succeeded' && s.video_url).pop()) ||
    (activeConversation?.scenes && activeConversation.scenes.length > 0
      ? activeConversation.scenes[activeConversation.scenes.length - 1]
      : null);

  const hasAnyArtifact = Boolean(activeConversation?.scenes && activeConversation.scenes.length > 0);
  const isDark = theme === 'dark';

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-200 ${
      isDark ? 'bg-[#0d0d0f] text-zinc-100' : 'bg-[#fbfbfa] text-stone-900'
    }`}>
      {/* Claude / ChatGPT Top Header */}
      <Header
        models={models}
        selectedModel={selectedModelId}
        onSelectModel={handleSelectModel}
        onNewConversation={handleNewConversation}
        onOpenKeys={() => setIsKeyModalOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        title={activeConversation?.title || 'New Animation'}
        isSidebarOpen={isSidebarOpen}
        hasArtifact={hasAnyArtifact}
        isArtifactOpen={isArtifactOpen}
        onToggleArtifact={() => setIsArtifactOpen(!isArtifactOpen)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          conversations={conversations}
          activeId={activeConversation?.id || null}
          onSelect={loadConversation}
          onDelete={handleDeleteConversation}
          onNew={handleNewConversation}
          onClose={() => setIsSidebarOpen(false)}
          models={models}
          selectedModel={selectedModelId}
          onSelectModel={handleSelectModel}
          theme={theme}
        />

        {/* Dynamic Split Layout: Chat & Claude Canvas */}
        <main className="flex-1 flex overflow-hidden relative">
          {/* Chat Panel */}
          <div className={`h-full overflow-hidden transition-all duration-300 flex-1 ${
            isArtifactOpen ? 'hidden lg:block' : 'block'
          }`}>
            <ChatPanel
              messages={activeConversation?.messages || []}
              scenes={activeConversation?.scenes || []}
              isLoading={isLoading}
              progressEvent={progressEvent}
              onSendMessage={handleSendMessage}
              onOpenArtifact={(sceneId) => {
                if (sceneId) setSelectedSceneId(sceneId);
                setIsArtifactOpen(true);
              }}
              activeSceneId={selectedSceneId}
              theme={theme}
              user={user}
              onRequireAuth={handleRequireAuth}
            />
          </div>

          {/* Right Canvas / Artifact Pane (Side-by-side on desktop, full-screen on mobile) */}
          {isArtifactOpen && (
            <div className="fixed inset-0 top-13 z-20 w-full h-[calc(100vh-3.25rem)] lg:static lg:top-0 lg:w-[50%] xl:w-[48%] lg:h-full lg:z-auto animate-in slide-in-from-right duration-300">
              <CanvasArtifact
                scene={activeScene}
                allScenes={activeConversation?.scenes || []}
                selectedSceneId={selectedSceneId}
                onSelectScene={(id) => setSelectedSceneId(id)}
                onClose={() => setIsArtifactOpen(false)}
                theme={theme}
              />
            </div>
          )}
        </main>
      </div>

      {/* API Key Settings Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onSave={handleSaveKeys}
        initialKeys={apiKeys}
        theme={theme}
      />

      {/* Google OAuth Login Modal */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingPrompt(null);
        }}
        onSuccess={handleAuthSuccess}
        theme={theme}
        pendingPrompt={pendingPrompt}
      />
    </div>
  );
}
