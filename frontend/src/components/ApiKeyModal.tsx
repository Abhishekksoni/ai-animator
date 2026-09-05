'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Check, Shield } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (keys: Record<string, string>) => void;
  initialKeys: Record<string, string>;
  theme: 'dark' | 'light';
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialKeys,
  theme,
}) => {
  const [keys, setKeys] = useState<Record<string, string>>(initialKeys);
  const [saved, setSaved] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    setKeys(initialKeys);
  }, [initialKeys]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(keys);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl border p-4 sm:p-6 shadow-2xl transition-all ${
        isDark
          ? 'border-[#2e2e33] bg-[#17171a] text-zinc-100 claude-shadow'
          : 'border-[#e6e4dc] bg-white text-stone-900 shadow-2xl'
      }`}>
        <div className={`flex items-center justify-between border-b pb-4 ${
          isDark ? 'border-[#242428]' : 'border-[#e6e4dc]'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
              isDark
                ? 'bg-[#d97736]/15 text-[#f59e6c] border-[#d97736]/30'
                : 'bg-[#d97736]/10 text-[#d97736] border-[#d97736]/20'
            }`}>
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className={`text-base font-semibold ${
                isDark ? 'text-zinc-100' : 'text-stone-900'
              }`}>
                LLM Provider API Keys
              </h3>
              <p className={`text-xs ${
                isDark ? 'text-zinc-400' : 'text-stone-500'
              }`}>
                Keys are stored securely in your browser's local storage.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`rounded-lg p-1.5 transition ${
              isDark
                ? 'text-zinc-400 hover:bg-[#242428] hover:text-white'
                : 'text-stone-400 hover:bg-[#f0efe9] hover:text-stone-900'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 flex items-center justify-between ${
              isDark ? 'text-zinc-300' : 'text-stone-700'
            }`}>
              <span>Google Gemini API Key</span>
              <span className="text-[10px] text-[#d97736] font-mono">Recommended (Fast & Free Tier)</span>
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={keys.gemini || ''}
              onChange={(e) => setKeys({ ...keys, gemini: e.target.value })}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono focus:border-[#d97736] focus:outline-none focus:ring-1 focus:ring-[#d97736] transition ${
                isDark
                  ? 'border-[#2e2e33] bg-[#121214] text-white placeholder-zinc-500'
                  : 'border-[#dcd9ce] bg-[#faf9f6] text-stone-900 placeholder-stone-400 focus:bg-white'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1.5 ${
              isDark ? 'text-zinc-300' : 'text-stone-700'
            }`}>
              Anthropic Claude API Key
            </label>
            <input
              type="password"
              placeholder="sk-ant-api03-..."
              value={keys.anthropic || ''}
              onChange={(e) => setKeys({ ...keys, anthropic: e.target.value })}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono focus:border-[#d97736] focus:outline-none focus:ring-1 focus:ring-[#d97736] transition ${
                isDark
                  ? 'border-[#2e2e33] bg-[#121214] text-white placeholder-zinc-500'
                  : 'border-[#dcd9ce] bg-[#faf9f6] text-stone-900 placeholder-stone-400 focus:bg-white'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1.5 ${
              isDark ? 'text-zinc-300' : 'text-stone-700'
            }`}>
              OpenAI API Key
            </label>
            <input
              type="password"
              placeholder="sk-proj-..."
              value={keys.openai || ''}
              onChange={(e) => setKeys({ ...keys, openai: e.target.value })}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono focus:border-[#d97736] focus:outline-none focus:ring-1 focus:ring-[#d97736] transition ${
                isDark
                  ? 'border-[#2e2e33] bg-[#121214] text-white placeholder-zinc-500'
                  : 'border-[#dcd9ce] bg-[#faf9f6] text-stone-900 placeholder-stone-400 focus:bg-white'
              }`}
            />
          </div>

          <div className={`rounded-xl border p-3 flex items-start gap-2.5 ${
            isDark
              ? 'border-[#2e2e33] bg-[#121214]/80 text-zinc-300'
              : 'border-[#f3d9c7] bg-[#fdf6f0] text-stone-700'
          }`}>
            <Shield className="h-4 w-4 text-[#d97736] shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              If no API key is specified, the system will use the server's environment variables or you can select the <strong>Offline Mock Generator</strong> for immediate local zero-cost rendering.
            </p>
          </div>
        </div>

        <div className={`mt-6 flex items-center justify-end gap-3 pt-3 border-t ${
          isDark ? 'border-[#242428]' : 'border-[#e6e4dc]'
        }`}>
          <button
            onClick={onClose}
            className={`rounded-xl px-4 py-2 text-xs font-medium transition ${
              isDark
                ? 'text-zinc-400 hover:bg-[#222226] hover:text-zinc-200'
                : 'text-stone-600 hover:bg-[#f0efe9] hover:text-stone-900'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-[#d97736] hover:bg-[#c26325] px-4 py-2 text-xs font-semibold text-white shadow-md transition active:scale-95 cursor-pointer"
          >
            {saved ? (
              <>
                <Check className="h-4 w-4 text-white" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Credentials</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
