'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp, Sparkles, Loader2,
  Film, ChevronRight, Lock
} from 'lucide-react';
import { Message, PipelineProgressEvent, Scene, AuthUser } from '../types';
import { PromptSuggestions } from './PromptSuggestions';

interface ChatPanelProps {
  messages: Message[];
  scenes: Scene[];
  isLoading: boolean;
  progressEvent: PipelineProgressEvent | null;
  onSendMessage: (content: string) => void;
  onOpenArtifact: (sceneId?: string) => void;
  activeSceneId: string | null;
  theme: 'dark' | 'light';
  user: AuthUser | null;
  onRequireAuth: (pendingPrompt?: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  scenes,
  isLoading,
  progressEvent,
  onSendMessage,
  onOpenArtifact,
  theme,
  user,
  onRequireAuth,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDark = theme === 'dark';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, progressEvent, isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const promptText = input.trim();
    if (!promptText || isLoading) return;

    if (!user) {
      onRequireAuth(promptText);
      return;
    }

    onSendMessage(promptText);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handlePromptSelect = (promptText: string) => {
    if (!user) {
      onRequireAuth(promptText);
      return;
    }
    onSendMessage(promptText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const getProgressLabel = (event: PipelineProgressEvent) => {
    switch (event.event) {
      case 'generating_code':
        return `Generating Manim animation code (Attempt ${event.attempt || 1}/${event.max_attempts || 3})...`;
      case 'linting':
        return 'Validating Python AST & security rules...';
      case 'rendering':
        return `Rendering in isolated sandbox container (Attempt ${event.attempt || 1}/${event.max_attempts || 3})...`;
      case 'auto_fixing':
        return `Self-correcting error with LLM (Attempt ${event.attempt || 1}/${event.max_attempts || 3})...`;
      case 'succeeded':
        return 'Animation rendered successfully!';
      case 'failed':
        return `Failed: ${event.error || 'Unknown error'}`;
      default:
        return event.message || 'Processing...';
    }
  };

  return (
    <div className={`flex flex-col h-full relative overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-[#0d0d0f]' : 'bg-[#fbfbfa]'
    }`}>
      {/* Scrollable Conversation Thread */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar max-w-3xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="py-12 space-y-8 text-center max-w-2xl mx-auto">
            <div className="space-y-3">
              <div className="inline-flex p-3 rounded-2xl bg-[#d97736]/10 text-[#d97736] border border-[#d97736]/20">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className={`text-2xl font-serif font-normal tracking-tight ${
                isDark ? 'text-zinc-100' : 'text-stone-900'
              }`}>
                What animation would you like to create?
              </h1>
              <p className={`text-xs max-w-md mx-auto leading-relaxed ${
                isDark ? 'text-zinc-400' : 'text-stone-600'
              }`}>
                Describe any mathematical proof, physical simulation, or algorithm in natural language. The AI generates and renders a 3Blue1Brown-style video.
              </p>
            </div>

            <PromptSuggestions onSelect={handlePromptSelect} theme={theme} />
          </div>
        ) : (
          <>
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              const matchingScene = !isUser
                ? scenes.find((s) => s.message_id === m.id) || (idx === messages.length - 1 ? scenes[scenes.length - 1] : null)
                : null;

              return (
                <div key={m.id} className="space-y-3">
                  <div className={`flex gap-3 text-sm leading-relaxed ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border mt-0.5 ${
                        isDark
                          ? 'bg-[#d97736]/20 text-[#f59e6c] border-[#d97736]/30'
                          : 'bg-[#d97736]/15 text-[#c26325] border-[#d97736]/30'
                      }`}>
                        <Sparkles className="h-4 w-4" />
                      </div>
                    )}

                    <div
                      className={`rounded-2xl px-4 py-3 max-w-[85%] ${
                        isUser
                          ? isDark
                            ? 'bg-[#27272a] text-zinc-100'
                            : 'bg-[#e8e6df] text-stone-900 font-normal'
                          : isDark
                            ? 'text-zinc-200 bg-transparent'
                            : 'text-stone-800 bg-transparent'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>

                      {/* Claude-style Artifact Card inside Assistant Message */}
                      {matchingScene && matchingScene.status === 'succeeded' && (
                        <div
                          onClick={() => onOpenArtifact(matchingScene.id)}
                          className={`mt-3 cursor-pointer group flex items-center justify-between rounded-xl border p-3 transition-all claude-shadow ${
                            isDark
                              ? 'border-[#2e2e33] bg-[#17171a] hover:border-[#d97736]/50 hover:bg-[#1e1e22]'
                              : 'border-[#e6e4dc] bg-white hover:border-[#d97736]/60 hover:bg-[#faf9f6]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg group-hover:scale-105 transition-transform ${
                              isDark
                                ? 'bg-[#d97736]/15 text-[#f59e6c]'
                                : 'bg-[#d97736]/15 text-[#c26325]'
                            }`}>
                              <Film className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold ${
                                  isDark
                                    ? 'text-zinc-200 group-hover:text-white'
                                    : 'text-stone-900 group-hover:text-stone-950'
                                }`}>
                                  Manim Animation
                                </span>
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                                  isDark
                                    ? 'bg-[#27272a] text-zinc-400'
                                    : 'bg-[#eceae4] text-stone-600'
                                }`}>
                                  v{matchingScene.version}
                                </span>
                              </div>
                              <p className={`text-[11px] ${
                                isDark ? 'text-zinc-400' : 'text-stone-500'
                              }`}>
                                Click to open interactive player & code canvas
                              </p>
                            </div>
                          </div>

                          <div className={`flex items-center gap-1.5 text-xs font-medium pr-1 ${
                            isDark ? 'text-[#f59e6c]' : 'text-[#c26325]'
                          }`}>
                            <span>Open Canvas</span>
                            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Live Step Progress (Claude-like Thinking Box) */}
        {isLoading && (
          <div className="flex gap-3 text-sm">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border mt-0.5 ${
              isDark
                ? 'bg-[#d97736]/20 text-[#f59e6c] border-[#d97736]/30'
                : 'bg-[#d97736]/15 text-[#c26325] border-[#d97736]/30'
            }`}>
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div className={`flex-1 rounded-2xl border p-3.5 space-y-2 max-w-lg claude-shadow ${
              isDark
                ? 'border-[#2e2e33] bg-[#17171a]'
                : 'border-[#e6e4dc] bg-white'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium flex items-center gap-2 ${
                  isDark ? 'text-zinc-200' : 'text-stone-800'
                }`}>
                  <span className="h-2 w-2 rounded-full bg-[#d97736] animate-ping" />
                  {progressEvent ? getProgressLabel(progressEvent) : 'Synthesizing scene...'}
                </span>
                {progressEvent?.attempt && (
                  <span className={`text-[10px] font-mono rounded px-2 py-0.5 ${
                    isDark ? 'bg-[#242428] text-zinc-400' : 'bg-[#eceae4] text-stone-600'
                  }`}>
                    Attempt {progressEvent.attempt}/3
                  </span>
                )}
              </div>

              {progressEvent?.error_trace && (
                <div className={`rounded-lg p-2 text-[10px] font-mono border ${
                  isDark
                    ? 'bg-red-950/20 border-red-900/30 text-red-300'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <span className={`font-semibold block mb-0.5 ${
                    isDark ? 'text-red-400' : 'text-red-600'
                  }`}>
                    Self-Correction Triggered:
                  </span>
                  <p className="line-clamp-2 opacity-80">{progressEvent.error_trace}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Claude / ChatGPT Input Capsule */}
      <div className={`p-4 bg-gradient-to-t to-transparent shrink-0 ${
        isDark
          ? 'from-[#0d0d0f] via-[#0d0d0f]'
          : 'from-[#fbfbfa] via-[#fbfbfa]'
      }`}>
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className={`relative flex flex-col rounded-3xl border p-2 transition-all claude-shadow ${
              isDark
                ? 'border-[#2e2e33] bg-[#17171a] focus-within:border-zinc-500'
                : 'border-[#dcd9ce] bg-white focus-within:border-stone-400'
            }`}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={
                scenes.length > 0
                  ? 'Iterate on animation (e.g. "make the circle gold", "slow down the transition")...'
                  : 'Describe an animation to generate (e.g. "explain Pythagorean theorem visually")...'
              }
              disabled={isLoading}
              className={`w-full resize-none bg-transparent px-3 py-2 text-sm focus:outline-none disabled:opacity-50 min-h-[44px] ${
                isDark
                  ? 'text-zinc-100 placeholder-zinc-500'
                  : 'text-stone-900 placeholder-stone-400'
              }`}
            />

            <div className={`flex items-center justify-between px-2 pt-1 border-t ${
              isDark ? 'border-[#222226]/60' : 'border-[#f0efe9]'
            }`}>
              <div className="flex items-center gap-2 text-[11px]">
                {scenes.length > 0 ? (
                  <span className={`flex items-center gap-1 font-medium ${
                    isDark ? 'text-[#f59e6c]' : 'text-[#c26325]'
                  }`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#d97736]" />
                    Editing active scene
                  </span>
                ) : !user ? (
                  <span className="flex items-center gap-1 text-amber-500 font-medium text-[10px]">
                    <Lock className="h-3 w-3" />
                    Sign in with Google to generate
                  </span>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-30 ${
                  isDark
                    ? 'bg-white text-black hover:bg-zinc-200 disabled:hover:bg-white'
                    : 'bg-stone-900 text-white hover:bg-black disabled:hover:bg-stone-900'
                }`}
              >
                {isLoading ? (
                  <Loader2 className={`h-4 w-4 animate-spin ${isDark ? 'text-black' : 'text-white'}`} />
                ) : (
                  <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                )}
              </button>
            </div>
          </form>

          <p className={`text-center text-[10px] mt-2 ${
            isDark ? 'text-zinc-600' : 'text-stone-400'
          }`}>
            AI generated Manim code runs in an isolated sandbox with automated self-correction.
          </p>
        </div>
      </div>
    </div>
  );
};
