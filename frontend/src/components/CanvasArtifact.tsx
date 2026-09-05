'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Play, Pause, Download, Repeat, Maximize,
  Code2, Video, X, Copy, Check, Sparkles
} from 'lucide-react';
import { Scene } from '../types';

interface CanvasArtifactProps {
  scene: Scene | null;
  allScenes: Scene[];
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onClose: () => void;
  theme: 'dark' | 'light';
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const CanvasArtifact: React.FC<CanvasArtifactProps> = ({
  scene,
  allScenes,
  onSelectScene,
  onClose,
  theme,
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'code'>('video');
  const [copied, setCopied] = useState(false);
  const isDark = theme === 'dark';

  // Video playback states
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(true);

  const videoUrl = scene?.video_url ? `${API_BASE}${scene.video_url}` : null;
  const code = scene?.code || '# No code generated';

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.load();
    }
  }, [scene?.id, scene?.video_url]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  const handleSpeedChange = () => {
    const speeds = [0.5, 1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadVideo = async () => {
    if (!videoUrl) return;
    try {
      setIsDownloading(true);
      const res = await fetch(videoUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manim_v${scene?.version || 1}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error, falling back:', err);
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `manim_v${scene?.version || 1}.mp4`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const codeLines = code.split('\n');

  return (
    <div className={`flex flex-col h-full border-l shadow-2xl relative overflow-hidden transition-colors duration-200 ${
      isDark
        ? 'bg-[#141416] border-[#242428]'
        : 'bg-[#fbfbfa] border-[#e6e4dc]'
    }`}>
      {/* Claude-style Artifact Top Bar */}
      <div className={`h-13 px-3 sm:px-4 border-b flex items-center justify-between shrink-0 transition-colors duration-200 ${
        isDark ? 'bg-[#18181b] border-[#242428]' : 'bg-white border-[#e6e4dc]'
      }`}>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className={`flex items-center gap-1 sm:gap-1.5 rounded-lg p-1 text-xs ${
            isDark ? 'bg-[#242428]' : 'bg-[#eceae4]'
          }`}>
            <button
              onClick={() => setActiveTab('video')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md font-medium transition ${
                activeTab === 'video'
                  ? isDark
                    ? 'bg-[#141416] text-white shadow-xs font-semibold'
                    : 'bg-white text-stone-900 shadow-xs font-semibold'
                  : isDark
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Video className="h-3.5 w-3.5 text-[#d97736]" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md font-medium transition ${
                activeTab === 'code'
                  ? isDark
                    ? 'bg-[#141416] text-white shadow-xs font-semibold'
                    : 'bg-white text-stone-900 shadow-xs font-semibold'
                  : isDark
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Code2 className="h-3.5 w-3.5 text-[#d97736]" />
              <span>Code</span>
            </button>
          </div>

          {scene && (
            <span className={`hidden sm:inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono ${
              isDark ? 'bg-[#242428] text-zinc-400' : 'bg-[#eceae4] text-stone-600'
            }`}>
              v{scene.version}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {activeTab === 'code' ? (
            <button
              onClick={handleCopyCode}
              title="Copy code"
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                isDark
                  ? 'border-[#2e2e33] bg-[#1d1d21] text-zinc-300 hover:bg-[#28282d] hover:text-white'
                  : 'border-[#dcd9ce] bg-white text-stone-700 hover:bg-[#f5f4ef] hover:text-stone-950 shadow-xs'
              }`}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          ) : (
            videoUrl && (
              <button
                onClick={handleDownloadVideo}
                disabled={isDownloading}
                title="Download MP4 video"
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                  isDark
                    ? 'border-[#2e2e33] bg-[#1d1d21] text-zinc-300 hover:bg-[#28282d] hover:text-white'
                    : 'border-[#dcd9ce] bg-white text-stone-700 hover:bg-[#f5f4ef] hover:text-stone-950 shadow-xs'
                }`}
              >
                <Download className={`h-3.5 w-3.5 ${isDownloading ? 'animate-bounce text-[#d97736]' : ''}`} />
                <span className="hidden sm:inline">{isDownloading ? 'Downloading...' : 'MP4'}</span>
              </button>
            )
          )}

          <button
            onClick={onClose}
            title="Close canvas (back to chat)"
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
              isDark
                ? 'text-zinc-400 hover:bg-[#242428] hover:text-white'
                : 'text-stone-500 hover:bg-[#edebe5] hover:text-stone-900'
            }`}
          >
            <X className="h-4 w-4" />
            <span className="lg:hidden text-[11px]">Chat</span>
          </button>
        </div>
      </div>

      {/* Version History Selector Pills (if multiple versions) */}
      {allScenes.length > 1 && (
        <div className={`flex items-center justify-between px-4 py-2 border-b text-xs shrink-0 ${
          isDark ? 'border-[#242428] bg-[#121214] text-zinc-500' : 'border-[#e6e4dc] bg-[#f5f4f0] text-stone-500'
        }`}>
          <span className="font-medium">Versions:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
            {allScenes.map((s, idx) => {
              const isSelected = s.id === scene?.id;
              const hasVideo = Boolean(s.video_url);
              return (
                <button
                  key={s.id}
                  onClick={() => onSelectScene(s.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono transition ${
                    isSelected
                      ? 'bg-[#d97736] text-white font-bold'
                      : isDark
                        ? 'bg-[#1c1c20] text-zinc-400 hover:bg-[#25252a] hover:text-white'
                        : 'bg-white border border-[#e0ded6] text-stone-700 hover:bg-[#faf9f5]'
                  }`}
                >
                  <span>v{s.version || idx + 1}</span>
                  {hasVideo ? (
                    <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Viewport Content */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {activeTab === 'video' ? (
          <div className="flex-1 flex flex-col justify-between bg-black overflow-hidden">
            {/* Video Canvas */}
            <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  loop={isLooping}
                  playsInline
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  onClick={togglePlay}
                  className="w-full h-full object-contain cursor-pointer"
                />
              ) : (
                <div className={`text-center p-8 space-y-2 ${isDark ? 'text-zinc-500' : 'text-stone-400'}`}>
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-60" />
                  <p className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-stone-700'}`}>Ready to Render</p>
                  <p className="text-xs">Video will appear here once synthesized.</p>
                </div>
              )}

              {/* Big Play Button on pause */}
              {videoUrl && !isPlaying && (
                <button
                  onClick={togglePlay}
                  className="absolute flex h-14 w-14 items-center justify-center rounded-full bg-white/90 hover:bg-white text-black shadow-2xl backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
                >
                  <Play className="h-6 w-6 translate-x-0.5 fill-current" />
                </button>
              )}
            </div>

            {/* Video Controls Bar */}
            {videoUrl && (
              <div className={`p-3.5 border-t space-y-2 shrink-0 ${
                isDark ? 'bg-[#141416] border-[#242428]' : 'bg-white border-[#e6e4dc]'
              }`}>
                {/* Timeline Scrubber */}
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-mono min-w-[32px] ${
                    isDark ? 'text-zinc-400' : 'text-stone-600'
                  }`}>
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.01}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1 h-1.5 bg-stone-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#d97736]"
                  />
                  <span className={`text-[11px] font-mono min-w-[32px] ${
                    isDark ? 'text-zinc-400' : 'text-stone-600'
                  }`}>
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Control buttons */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={togglePlay}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                        isDark
                          ? 'bg-[#202024] text-white hover:bg-[#2a2a30]'
                          : 'bg-[#f0efe9] text-stone-800 hover:bg-[#e4e2db]'
                      }`}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                    </button>

                    <button
                      onClick={handleSpeedChange}
                      title="Playback Speed"
                      className={`rounded-lg px-2 py-1 text-xs font-mono font-medium transition ${
                        isDark
                          ? 'bg-[#202024] text-zinc-300 hover:bg-[#2a2a30] hover:text-white'
                          : 'bg-[#f0efe9] text-stone-700 hover:bg-[#e4e2db] hover:text-stone-900'
                      }`}
                    >
                      {playbackRate}x
                    </button>

                    <button
                      onClick={() => setIsLooping(!isLooping)}
                      title={isLooping ? 'Looping enabled' : 'Looping disabled'}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                        isLooping
                          ? isDark
                            ? 'bg-[#d97736]/20 text-[#f59e6c] border border-[#d97736]/30'
                            : 'bg-[#d97736]/15 text-[#c26325] border border-[#d97736]/30 font-semibold'
                          : isDark
                            ? 'bg-[#202024] text-zinc-400 hover:bg-[#2a2a30] hover:text-white'
                            : 'bg-[#f0efe9] text-stone-500 hover:bg-[#e4e2db] hover:text-stone-800'
                      }`}
                    >
                      <Repeat className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {scene?.render_duration_ms ? (
                      <span className={`text-[10px] font-mono ${
                        isDark ? 'text-zinc-500' : 'text-stone-400'
                      }`}>
                        Rendered in {(scene.render_duration_ms / 1000).toFixed(1)}s
                      </span>
                    ) : null}

                    <button
                      onClick={() => {
                        if (videoRef.current && videoRef.current.requestFullscreen) {
                          videoRef.current.requestFullscreen();
                        }
                      }}
                      title="Fullscreen"
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                        isDark
                          ? 'bg-[#202024] text-zinc-300 hover:bg-[#2a2a30] hover:text-white'
                          : 'bg-[#f0efe9] text-stone-700 hover:bg-[#e4e2db] hover:text-stone-900'
                      }`}
                    >
                      <Maximize className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Code Inspector View */
          <div className={`flex-1 overflow-auto p-4 font-mono text-xs custom-scrollbar select-text ${
            isDark ? 'bg-[#111113] text-zinc-300' : 'bg-[#fdfcf9] text-stone-800'
          }`}>
            <table className="w-full border-collapse">
              <tbody>
                {codeLines.map((line, idx) => (
                  <tr key={idx} className={`leading-5 ${isDark ? 'hover:bg-[#18181c]' : 'hover:bg-[#f3f2eb]'}`}>
                    <td className={`w-10 select-none pr-4 text-right font-mono text-[11px] ${
                      isDark ? 'text-zinc-600' : 'text-stone-400'
                    }`}>
                      {idx + 1}
                    </td>
                    <td className="whitespace-pre font-mono">
                      <span className={
                        line.trim().startsWith('#')
                          ? isDark ? 'text-zinc-500 italic' : 'text-stone-400 italic'
                          : line.includes('class ') || line.includes('def ') || line.includes('import ')
                          ? isDark ? 'text-[#f59e6c] font-semibold' : 'text-[#c26325] font-semibold'
                          : line.includes('self.play') || line.includes('Create') || line.includes('Transform')
                          ? isDark ? 'text-[#60a5fa]' : 'text-[#2563eb]'
                          : line.includes('"') || line.includes("'")
                          ? isDark ? 'text-amber-300' : 'text-[#b45309]'
                          : isDark ? 'text-zinc-200' : 'text-stone-800'
                      }>
                        {line}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
