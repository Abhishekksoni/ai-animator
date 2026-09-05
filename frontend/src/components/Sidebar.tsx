'use client';

import React from 'react';
import {
  Plus, MessageSquare, Trash2,
  Film, X, ChevronDown, Cpu
} from 'lucide-react';
import { ConversationSummary, ModelOption } from '../types';

interface SidebarProps {
  isOpen: boolean;
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onNew: () => void;
  onClose?: () => void;
  models?: ModelOption[];
  selectedModel?: string;
  onSelectModel?: (modelId: string) => void;
  theme: 'dark' | 'light';
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  conversations,
  activeId,
  onSelect,
  onDelete,
  onNew,
  onClose,
  models,
  selectedModel,
  onSelectModel,
  theme,
}) => {
  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const handleSelectConv = (id: string) => {
    onSelect(id);
    if (onClose && typeof window !== 'undefined' && window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 top-[52px] bg-black/60 backdrop-blur-xs z-30 md:hidden animate-in fade-in duration-200"
      />

      <aside className={`fixed top-[52px] bottom-0 left-0 z-40 w-72 max-w-[85vw] md:relative md:top-0 md:h-full md:w-64 border-r flex flex-col shrink-0 select-none transition-colors duration-200 shadow-2xl md:shadow-none animate-in slide-in-from-left duration-200 ${
        isDark
          ? 'border-[#242428] bg-[#111113]'
          : 'border-[#e6e4dc] bg-[#f5f4f0]'
      }`}>
        {/* New Chat Button & Mobile Close Button */}
        <div className={`p-3 border-b flex items-center gap-2 ${isDark ? 'border-[#1f1f23]' : 'border-[#e6e4dc]'}`}>
          <button
            onClick={() => {
              onNew();
              if (onClose && typeof window !== 'undefined' && window.innerWidth < 768) {
                onClose();
              }
            }}
            className={`flex-1 flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-medium transition shadow-xs ${
              isDark
                ? 'border-[#2e2e33] bg-[#17171a] text-zinc-200 hover:bg-[#202024] hover:text-white hover:border-zinc-600'
                : 'border-[#dcd9ce] bg-white text-stone-800 hover:bg-[#faf9f6] hover:text-stone-950 hover:border-stone-400'
            }`}
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#d97736]" />
              <span>New Animation</span>
            </span>
            <span className={`text-[10px] font-mono hidden md:inline ${isDark ? 'text-zinc-500' : 'text-stone-400'}`}>⌘N</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              title="Close sidebar"
              className={`md:hidden flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                isDark
                  ? 'border-[#2e2e33] bg-[#17171a] text-zinc-400 hover:bg-[#202024] hover:text-white'
                  : 'border-[#dcd9ce] bg-white text-stone-600 hover:bg-[#faf9f6] hover:text-stone-900 shadow-xs'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Model Selector for Small Screens (Mobile Only) */}
        {models && models.length > 0 && onSelectModel && (
          <div className={`p-3 border-b sm:hidden ${isDark ? 'border-[#1f1f23]' : 'border-[#e6e4dc]'}`}>
            <label className={`block text-[10px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${
              isDark ? 'text-zinc-500' : 'text-stone-500'
            }`}>
              <Cpu className="h-3 w-3 text-[#d97736]" />
              <span>AI Model</span>
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => onSelectModel(e.target.value)}
                className={`w-full appearance-none rounded-xl border pl-3 pr-8 py-2 text-xs font-medium focus:border-[#d97736] focus:outline-none cursor-pointer transition ${
                  isDark
                    ? 'border-[#2e2e33] bg-[#17171a] text-zinc-200'
                    : 'border-[#dcd9ce] bg-white text-stone-800 shadow-xs'
                }`}
              >
                {models.map((m) => (
                  <option
                    key={m.id}
                    value={m.id}
                    className={isDark ? 'bg-[#17171a] text-zinc-200' : 'bg-white text-stone-800'}
                  >
                    {m.name}
                  </option>
                ))}
              </select>
              <ChevronDown className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${
                isDark ? 'text-zinc-400' : 'text-stone-500'
              }`} />
            </div>
          </div>
        )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
        {/* User Conversations Section (if any) */}
        {conversations.filter(c => !c.is_sample).length > 0 && (
          <div className="space-y-1">
            <div className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
              isDark ? 'text-zinc-500' : 'text-stone-500'
            }`}>
              My Animations
            </div>
            {conversations.filter(c => !c.is_sample).map((c) => {
              const isActive = c.id === activeId;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectConv(c.id)}
                  className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer text-xs transition border ${
                    isActive
                      ? isDark
                        ? 'bg-[#1f1f23] border-[#333338] text-white font-medium shadow-xs'
                        : 'bg-white border-[#dcd9ce] text-stone-950 font-medium shadow-xs'
                      : isDark
                        ? 'border-transparent text-zinc-400 hover:bg-[#17171a] hover:text-zinc-200'
                        : 'border-transparent text-stone-600 hover:bg-[#edebe5] hover:text-stone-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate flex-1 mr-2">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                      isActive
                        ? isDark
                          ? 'bg-[#d97736]/20 text-[#f59e6c]'
                          : 'bg-[#d97736]/15 text-[#c26325]'
                        : isDark
                          ? 'bg-[#1a1a1d] text-zinc-500'
                          : 'bg-[#e8e6df] text-stone-500'
                    }`}>
                      {c.scene_count > 0 ? (
                        <Film className="h-3.5 w-3.5" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5" />
                      )}
                    </div>

                    <div className="truncate flex-1">
                      <div className={`truncate text-xs ${
                        isDark
                          ? 'text-zinc-300 group-hover:text-white'
                          : 'text-stone-800 group-hover:text-stone-950'
                      }`}>
                        {c.title || 'Untitled Animation'}
                      </div>
                      {c.scene_count > 0 && (
                        <div className={`flex items-center gap-1.5 text-[10px] mt-0.5 ${
                          isDark ? 'text-zinc-500' : 'text-stone-400'
                        }`}>
                          <span>v{c.scene_count}</span>
                          <span>•</span>
                          <span>{new Date(c.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => onDelete(c.id, e)}
                    title="Delete project"
                    className={`opacity-0 group-hover:opacity-100 rounded-lg p-1.5 transition ${
                      isDark
                        ? 'text-zinc-500 hover:bg-red-950/40 hover:text-red-400'
                        : 'text-stone-400 hover:bg-red-100/60 hover:text-red-600'
                    }`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Showcase Gallery Samples */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2.5 py-1">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              isDark ? 'text-zinc-500' : 'text-stone-500'
            }`}>
              Showcase Gallery
            </span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
              isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              Sample
            </span>
          </div>

          {conversations.filter(c => c.is_sample).map((c) => {
            const isActive = c.id === activeId;
            return (
              <div
                key={c.id}
                onClick={() => handleSelectConv(c.id)}
                className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer text-xs transition border ${
                  isActive
                    ? isDark
                      ? 'bg-[#1f1f23] border-[#333338] text-white font-medium shadow-xs'
                      : 'bg-white border-[#dcd9ce] text-stone-950 font-medium shadow-xs'
                    : isDark
                      ? 'border-transparent text-zinc-400 hover:bg-[#17171a] hover:text-zinc-200'
                      : 'border-transparent text-stone-600 hover:bg-[#edebe5] hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate flex-1">
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                    isActive
                      ? isDark
                        ? 'bg-[#d97736]/20 text-[#f59e6c]'
                        : 'bg-[#d97736]/15 text-[#c26325]'
                      : isDark
                        ? 'bg-[#1a1a1d] text-amber-500/80'
                        : 'bg-[#e8e6df] text-amber-600'
                  }`}>
                    <Film className="h-3.5 w-3.5" />
                  </div>

                  <div className="truncate flex-1">
                    <div className={`truncate text-xs ${
                      isDark
                        ? 'text-zinc-300 group-hover:text-white'
                        : 'text-stone-800 group-hover:text-stone-950'
                    }`}>
                      {c.title || 'Showcase Animation'}
                    </div>
                    <div className={`flex items-center gap-1.5 text-[10px] mt-0.5 ${
                      isDark ? 'text-zinc-500' : 'text-stone-400'
                    }`}>
                      <span className="text-amber-500/90 font-medium">Showcase Video</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer info */}
      <div className={`p-3 border-t text-[11px] flex items-center justify-between ${
        isDark ? 'border-[#1f1f23] text-zinc-500' : 'border-[#e6e4dc] text-stone-500'
      }`}>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          Manim Studio
        </span>
        <span className="font-mono text-[10px]">v0.19</span>
      </div>
    </aside>
    </>
  );
};
