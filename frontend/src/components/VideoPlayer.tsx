'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, Maximize,
  Download, Repeat, Zap, Layers, Sparkles, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Scene } from '../types';

interface VideoPlayerProps {
  scene: Scene | null;
  allScenes: Scene[];
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  scene,
  allScenes,
  selectedSceneId,
  onSelectScene,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  const videoUrl = scene?.video_url ? `${API_BASE}${scene.video_url}` : null;

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

  const toggleLoop = () => {
    setIsLooping(!isLooping);
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
      a.download = `manim_scene_v${scene?.version || 1}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error, falling back:', err);
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `manim_scene_v${scene?.version || 1}.mp4`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
      {/* Version History Selector Ribbon */}
      {allScenes.length > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-900/90 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-300">Versions:</span>
          </div>
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
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'bg-slate-800/90 text-slate-400 hover:bg-slate-700/80 hover:text-slate-200'
                  }`}
                >
                  <span>v{s.version || idx + 1}</span>
                  {hasVideo ? (
                    <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-slate-950' : 'bg-emerald-400'}`} />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Video Viewport */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black/60 backdrop-blur-xs">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            loop={isLooping}
            muted={isMuted}
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 mb-3 text-cyan-400/60">
              <Sparkles className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium text-slate-300">Ready to Render</p>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Describe an animation in the chat to generate and render your 3Blue1Brown-style Manim video.
            </p>
          </div>
        )}

        {/* Center Play Overlay Button on Pause */}
        {videoUrl && !isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/80 hover:bg-cyan-400 text-slate-950 shadow-2xl backdrop-blur-sm transition-transform transform hover:scale-110 active:scale-95"
          >
            <Play className="h-8 w-8 translate-x-0.5 fill-current" />
          </button>
        )}
      </div>

      {/* Video Controls Bar */}
      {videoUrl && (
        <div className="p-3 bg-slate-900/95 border-t border-slate-800/80 space-y-2 shrink-0">
          {/* Progress Timeline Slider */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-400 min-w-[32px]">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[11px] font-mono text-slate-400 min-w-[32px]">
              {formatTime(duration)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
              </button>

              <button
                onClick={handleSpeedChange}
                title="Playback speed"
                className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-mono font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                {playbackRate}x
              </button>

              <button
                onClick={toggleLoop}
                title={isLooping ? 'Looping enabled' : 'Looping disabled'}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  isLooping ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Repeat className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700/50">
                <Zap className="h-3 w-3 text-amber-400" />
                {scene?.render_duration_ms ? `${(scene.render_duration_ms / 1000).toFixed(1)}s render` : 'Rendered'}
              </span>

              <button
                onClick={handleDownloadVideo}
                disabled={isDownloading}
                title="Download MP4 video"
                className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
              >
                <Download className={`h-3.5 w-3.5 ${isDownloading ? 'animate-bounce text-cyan-400' : ''}`} />
                <span className="hidden sm:inline">{isDownloading ? 'Downloading...' : 'MP4'}</span>
              </button>

              <button
                onClick={handleFullscreen}
                title="Fullscreen"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                <Maximize className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
