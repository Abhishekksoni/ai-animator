'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, ShieldCheck, Film, Code2, AlertCircle } from 'lucide-react';
import { AuthUser } from '../types';
import { loginWithGoogle } from '../lib/api';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  theme: 'dark' | 'light';
  pendingPrompt?: string | null;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  theme,
  pendingPrompt,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gisLoaded, setGisLoaded] = useState(false);
  const isDark = theme === 'dark';
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '246844225596-qijj36kv7vd2lcvhk3lkdhdltflbhpve.apps.googleusercontent.com';

  // Load Google Identity Services script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ((window as any).google?.accounts?.id) {
      setGisLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGisLoaded(true);
    };
    script.onerror = () => {
      setError('Failed to load Google Sign-In SDK. Please check your internet connection.');
    };
    document.head.appendChild(script);
  }, []);

  // Initialize and render Google Sign-In button whenever modal is open and GIS is loaded
  useEffect(() => {
    if (!isOpen || !gisLoaded || typeof window === 'undefined') return;

    const google = (window as any).google;
    if (!google?.accounts?.id) return;

    try {
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
        google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: isDark ? 'filled_black' : 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: 340,
        });
      }

      // Display One-Tap popup prompt
      google.accounts.id.prompt();
    } catch (err: any) {
      console.error('Error initializing Google GIS:', err);
    }
  }, [isOpen, gisLoaded, isDark, googleClientId]);

  if (!isOpen) return null;

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response?.credential) {
      setError('Google did not return a valid authentication token. Please try again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const user = await loginWithGoogle({ credential: response.credential });
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please verify your OAuth settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualTrigger = () => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      setError(null);
      (window as any).google.accounts.id.prompt();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className={`relative w-full max-w-md rounded-3xl border p-6 shadow-2xl transition-all ${
        isDark
          ? 'border-[#2e2e33] bg-[#17171a] text-zinc-100 claude-shadow'
          : 'border-[#e6e4dc] bg-white text-stone-900 shadow-2xl'
      }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 rounded-full p-1.5 transition ${
            isDark
              ? 'text-zinc-400 hover:bg-[#242428] hover:text-white'
              : 'text-stone-400 hover:bg-[#f0efe9] hover:text-stone-900'
          }`}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2.5 pt-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d97736]/15 text-[#d97736] border border-[#d97736]/30 mb-1">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className={`text-xl font-serif font-semibold tracking-tight ${
            isDark ? 'text-zinc-100' : 'text-stone-900'
          }`}>
            Sign in to Generate
          </h2>
          <p className={`text-xs max-w-xs mx-auto leading-relaxed ${
            isDark ? 'text-zinc-400' : 'text-stone-600'
          }`}>
            Sign in with your Google account to render 3Blue1Brown-style Manim animations and save your project history.
          </p>
        </div>

        {/* Pending Prompt Preview (if user typed a prompt before logging in) */}
        {pendingPrompt && (
          <div className={`my-4 rounded-2xl p-3 text-xs border ${
            isDark
              ? 'bg-[#121214] border-[#27272a] text-zinc-300'
              : 'bg-[#fbfbfa] border-[#e6e4dc] text-stone-700'
          }`}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#d97736] block mb-1">
              Your Pending Prompt:
            </span>
            <p className="line-clamp-2 italic font-mono text-[11px] opacity-90">"{pendingPrompt}"</p>
          </div>
        )}

        {/* Features Unlocked List */}
        <div className="my-5 space-y-2.5 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-500">
              <Film className="h-3 w-3" />
            </div>
            <span className={isDark ? 'text-zinc-300' : 'text-stone-700'}>
              Unlimited Manim sandboxed MP4 rendering
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#d97736]/15 text-[#d97736]">
              <Code2 className="h-3 w-3" />
            </div>
            <span className={isDark ? 'text-zinc-300' : 'text-stone-700'}>
              Automated AST linter & iterative self-correction
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-blue-500/15 text-blue-500">
              <ShieldCheck className="h-3 w-3" />
            </div>
            <span className={isDark ? 'text-zinc-300' : 'text-stone-700'}>
              Saved cloud workspace in Supabase PostgreSQL
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {/* Official Google OAuth Sign-In Button */}
        <div className="space-y-3 pt-2">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-zinc-400">
              <div className="h-4 w-4 rounded-full border-2 border-[#d97736] border-t-transparent animate-spin" />
              <span>Verifying with Google & Supabase...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              {/* Google Identity Services Render Target */}
              <div ref={googleBtnRef} className="min-h-[44px] flex justify-center w-full" />
            </div>
          )}
        </div>

        <p className={`text-center text-[10px] mt-4 ${
          isDark ? 'text-zinc-600' : 'text-stone-400'
        }`}>
          By continuing with Google, your animations and scenes will be saved in your private Supabase database workspace.
        </p>
      </div>
    </div>
  );
};
