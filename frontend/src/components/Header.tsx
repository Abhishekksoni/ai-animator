'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  PanelLeft, Key, ChevronDown,
  SplitSquareVertical, Sun, Moon, LogOut
} from 'lucide-react';
import { ModelOption, AuthUser } from '../types';

interface HeaderProps {
  models: ModelOption[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onNewConversation: () => void;
  onOpenKeys: () => void;
  onToggleSidebar: () => void;
  title: string;
  isSidebarOpen: boolean;
  hasArtifact: boolean;
  isArtifactOpen: boolean;
  onToggleArtifact: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  user: AuthUser | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  models,
  selectedModel,
  onSelectModel,
  onNewConversation,
  onOpenKeys,
  onToggleSidebar,
  title,
  isSidebarOpen,
  hasArtifact,
  isArtifactOpen,
  onToggleArtifact,
  theme,
  onToggleTheme,
  user,
  onOpenAuth,
  onSignOut,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={`h-13 h-[52px] sticky top-0 left-0 right-0 border-b px-2.5 sm:px-4 flex items-center justify-between shrink-0 z-30 transition-colors duration-200 ${
      isDark
        ? 'border-[#242428] bg-[#0d0d0f]'
        : 'border-[#e6e4dc] bg-[#fbfbfa]'
    }`}>
      {/* Left Section: Sidebar Toggle & Compact Model Selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
          className={`flex h-8 w-8 items-center justify-center rounded-xl border transition ${
            isSidebarOpen
              ? isDark
                ? 'border-[#333338] bg-[#1a1a1d] text-zinc-200'
                : 'border-[#dcd9ce] bg-white text-stone-800 shadow-xs'
              : isDark
                ? 'border-transparent text-zinc-400 hover:bg-[#1f1f23] hover:text-zinc-200'
                : 'border-transparent text-stone-600 hover:bg-[#edebe4] hover:text-stone-900'
          }`}
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        {/* Compact Model Selector Dropdown (Hidden on mobile, shown on sm+) */}
        <div className="relative hidden sm:block">
          <select
            value={selectedModel}
            onChange={(e) => onSelectModel(e.target.value)}
            className={`appearance-none rounded-lg border pl-2.5 pr-6 py-1 text-[11px] font-medium focus:border-[#d97736] focus:outline-none cursor-pointer transition max-w-[130px] md:max-w-[160px] truncate ${
              isDark
                ? 'border-[#2e2e33] bg-[#17171a] text-zinc-300 hover:bg-[#1f1f23]'
                : 'border-[#dcd9ce] bg-white text-stone-700 hover:bg-[#f5f4ef] shadow-xs'
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
          <ChevronDown className={`pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 ${
            isDark ? 'text-zinc-400' : 'text-stone-500'
          }`} />
        </div>
      </div>

      {/* Center Section: Active Conversation Title on Desktop */}
      <div className={`hidden md:flex items-center text-xs font-medium truncate max-w-xs lg:max-w-md ${
        isDark ? 'text-zinc-400' : 'text-stone-600'
      }`}>
        <span className="truncate">{title || 'New Animation'}</span>
      </div>

      {/* Right Section: Canvas, API Keys, Theme Toggle & User Auth */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Canvas Split-Screen Button */}
        {hasArtifact && (
          <button
            onClick={onToggleArtifact}
            title={isArtifactOpen ? 'Close canvas preview' : 'Open canvas preview'}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-medium border transition ${
              isArtifactOpen
                ? isDark
                  ? 'bg-[#d97736]/15 border-[#d97736]/40 text-[#f59e6c]'
                  : 'bg-[#d97736]/15 border-[#d97736]/50 text-[#c26325] font-semibold'
                : isDark
                  ? 'bg-[#17171a] border-[#2e2e33] text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f23]'
                  : 'bg-white border-[#dcd9ce] text-stone-600 hover:text-stone-900 hover:bg-[#f5f4ef] shadow-xs'
            }`}
          >
            <SplitSquareVertical className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Canvas</span>
          </button>
        )}

        {/* API Key Modal Button */}
        <button
          onClick={onOpenKeys}
          title="Configure LLM API Keys"
          className={`flex items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 py-1.5 text-xs font-medium transition ${
            isDark
              ? 'border-[#2e2e33] bg-[#17171a] text-zinc-300 hover:bg-[#1f1f23] hover:text-white'
              : 'border-[#dcd9ce] bg-white text-stone-700 hover:bg-[#f5f4ef] hover:text-stone-950 shadow-xs'
          }`}
        >
          <Key className="h-3.5 w-3.5 text-[#d97736]" />
          <span className="hidden md:inline">API Keys</span>
        </button>

        {/* Dark / Light Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`flex h-8 w-8 items-center justify-center rounded-xl border transition ${
            isDark
              ? 'border-[#2e2e33] bg-[#17171a] text-amber-400 hover:bg-[#1f1f23] hover:text-amber-300'
              : 'border-[#dcd9ce] bg-white text-stone-700 hover:bg-[#f5f4ef] hover:text-stone-900 shadow-xs'
          }`}
        >
          {isDark ? (
            <Sun className="h-4 w-4 transition-transform hover:rotate-45" />
          ) : (
            <Moon className="h-4 w-4 transition-transform hover:-rotate-12" />
          )}
        </button>

        {/* Google OAuth Login / User Avatar Profile */}
        {user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`flex items-center gap-1.5 rounded-xl p-0.5 sm:p-1 transition border ${
                isDark
                  ? 'hover:bg-[#1f1f23] border-transparent hover:border-[#d97736]/30'
                  : 'hover:bg-[#f5f4ef] border-transparent hover:border-[#d97736]/30'
              }`}
              title={user.email}
            >
              <img
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email || user.name || 'creator')}`}
                alt={user.name || 'Robot Avatar'}
                className="h-7 w-7 rounded-lg object-cover ring-1 ring-[#d97736]/40 bg-[#d97736]/10"
              />
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div className={`absolute right-0 mt-2 w-56 rounded-2xl border p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${
                isDark
                  ? 'border-[#2e2e33] bg-[#17171a] text-zinc-200 claude-shadow'
                  : 'border-[#e6e4dc] bg-white text-stone-800 shadow-xl'
              }`}>
                <div className="flex items-center gap-2.5 px-3 py-2 border-b border-inherit">
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email || user.name || 'creator')}`}
                    alt={user.name || 'Robot Avatar'}
                    className="h-8 w-8 rounded-lg object-cover ring-1 ring-[#d97736]/40 bg-[#d97736]/10 shrink-0"
                  />
                  <div className="truncate flex-1">
                    <p className="text-xs font-semibold truncate">{user.name || 'Creator'}</p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition text-red-500 hover:bg-red-500/10 cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-xl border px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition cursor-pointer active:scale-95 shadow-xs ${
              isDark
                ? 'border-[#38383e] bg-[#1e1e22] text-zinc-200 hover:bg-[#28282d] hover:text-white hover:border-[#d97736]/40'
                : 'border-[#dcd9ce] bg-white text-stone-800 hover:bg-[#faf9f6] hover:border-stone-400'
            }`}
          >
            {/* Google G Logo */}
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
