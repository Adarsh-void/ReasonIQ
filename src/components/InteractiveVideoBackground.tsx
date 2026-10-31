/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Video, Pause, Play, Sparkles, Radio } from 'lucide-react';
import { soundFX } from '../utils/audioEffects';

export interface VideoTheme {
  id: string;
  name: string;
  url: string;
  accentColor: string;
  description: string;
}

export const VIDEO_CHANNELS: VideoTheme[] = [
  {
    id: 'synapse-core',
    name: 'Neural Synapse',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    accentColor: '#3b82f6',
    description: 'High-frequency analytical synapses & logic flow',
  },
  {
    id: 'cyber-grid',
    name: 'Cyber Quantum',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    accentColor: '#10b981',
    description: 'Algorithmic matrix & deductive matrices',
  },
  {
    id: 'deep-space',
    name: 'Cosmic Thought',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    accentColor: '#8b5cf6',
    description: 'Deep spatial cognition & universe abstraction',
  },
];

interface InteractiveVideoBackgroundProps {
  isMuted: boolean;
  onToggleMute: () => void;
}

export const InteractiveVideoBackground: React.FC<InteractiveVideoBackgroundProps> = ({
  isMuted,
  onToggleMute,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<VideoTheme>(VIDEO_CHANNELS[0]);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [isFocusHumActive, setIsFocusHumActive] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePos = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  // Handle Video Playback state
  useEffect(() => {
    if (!videoRef.current) return;
    if (isVideoPlaying) {
      videoRef.current.play().catch(() => {
        // Autoplay may require mute or gesture
      });
    } else {
      videoRef.current.pause();
    }
  }, [isVideoPlaying, selectedChannel]);

  // 60FPS Interactive Particle Synapse Canvas Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle nodes definition
    const particleCount = Math.min(Math.floor((width * height) / 14000), 75);
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseAlpha: number;
      pulseSpeed: number;
      pulsePhase: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 2 + 1.2,
        baseAlpha: Math.random() * 0.5 + 0.25,
        pulseSpeed: Math.random() * 0.03 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Subtle ambient radiant gradient
      const gradient = ctx.createRadialGradient(
        mousePos.current.active ? mousePos.current.x : width * 0.5,
        mousePos.current.active ? mousePos.current.y : height * 0.4,
        20,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.8
      );
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.08)');
      gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.03)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Update and draw particles
      const maxDistance = 140;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges smoothly
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Interactive mouse gravity attraction
        if (mousePos.current.active) {
          const dx = mousePos.current.x - p.x;
          const dy = mousePos.current.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180 && dist > 10) {
            const force = (180 - dist) / 180 * 0.04;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        // Apply friction
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(147, 197, 253, ${alpha})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }

        // Draw particle node
        const currentAlpha = p.baseAlpha + Math.sin(time * p.pulseSpeed + p.pulsePhase) * 0.15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(191, 219, 254, ${Math.max(0.1, currentAlpha)})`;
        ctx.shadowColor = 'rgba(59, 130, 246, 0.4)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    mousePos.current = {
      x: e.clientX,
      y: e.clientY,
      active: true,
    };
  };

  const handleMouseLeave = () => {
    mousePos.current.active = false;
  };

  const handleToggleFocusHum = () => {
    soundFX.playClick(500);
    const active = soundFX.toggleFocusHum();
    setIsFocusHumActive(active);
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* HTML5 Ambient Video Player */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          key={selectedChannel.url}
          src={selectedChannel.url}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => {
            setVideoLoaded(true);
            setVideoFailed(false);
          }}
          onError={() => {
            setVideoFailed(true);
            setVideoLoaded(false);
          }}
          className={`w-full h-full object-cover transition-opacity duration-1000 ${
            videoLoaded && isVideoPlaying && !videoFailed ? 'opacity-30' : 'opacity-0'
          }`}
          style={{
            filter: 'contrast(1.15) brightness(0.6) saturate(1.2)',
          }}
        />

        {/* Video High-Contrast Vignette & Film Grain Overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(10, 15, 30, 0.5) 0%, rgba(5, 8, 20, 0.92) 100%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Interactive Canvas Synapse Network */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-1 pointer-events-auto cursor-default"
      />

      {/* Interactive Media Control Bar in Top-Right */}
      <div className="absolute top-4 right-4 z-30 pointer-events-auto flex items-center gap-2">
        {/* Toggle Sound FX */}
        <button
          type="button"
          onClick={() => {
            soundFX.playClick(650);
            onToggleMute();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium backdrop-blur-md shadow-md transition-all hover:scale-105 active:scale-95"
          style={{
            backgroundColor: isMuted ? 'rgba(30, 41, 59, 0.7)' : 'rgba(59, 130, 246, 0.2)',
            borderColor: isMuted ? 'rgba(255, 255, 255, 0.15)' : 'rgba(59, 130, 246, 0.5)',
            color: isMuted ? '#94a3b8' : '#bfdbfe',
          }}
          title={isMuted ? 'Unmute UI sounds' : 'Mute UI sounds'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-blue-400 animate-pulse" />}
          <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Audio FX'}</span>
        </button>

        {/* Toggle Binaural Theta Focus Hum */}
        <button
          type="button"
          onClick={handleToggleFocusHum}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium backdrop-blur-md shadow-md transition-all hover:scale-105 active:scale-95"
          style={{
            backgroundColor: isFocusHumActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(30, 41, 59, 0.7)',
            borderColor: isFocusHumActive ? 'rgba(16, 185, 129, 0.6)' : 'rgba(255, 255, 255, 0.15)',
            color: isFocusHumActive ? '#6ee7b7' : '#94a3b8',
          }}
          title="Toggle 108Hz Theta Focus Drone for deep concentration"
        >
          <Radio className={`w-3.5 h-3.5 ${isFocusHumActive ? 'text-emerald-400 animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isFocusHumActive ? 'Focus Hum: On' : '108Hz Focus'}</span>
        </button>

        {/* Ambient Video Controller Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              soundFX.playClick(580);
              setShowControls(!showControls);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium backdrop-blur-md shadow-md transition-all hover:scale-105 active:scale-95"
            style={{
              backgroundColor: isVideoPlaying ? 'rgba(139, 92, 246, 0.2)' : 'rgba(30, 41, 59, 0.7)',
              borderColor: isVideoPlaying ? 'rgba(139, 92, 246, 0.5)' : 'rgba(255, 255, 255, 0.15)',
              color: isVideoPlaying ? '#ddd6fe' : '#94a3b8',
            }}
          >
            <Video className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Motion: {selectedChannel.name}</span>
          </button>

          {showControls && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-2xl border p-3 shadow-2xl backdrop-blur-xl z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
                color: '#f8fafc',
              }}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-main)]/60 font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Video Ambience
                </span>
                <button
                  type="button"
                  onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                  className="p-1 rounded-md hover:bg-[var(--bg-surface-elevated)] text-slate-300 transition-colors"
                  title={isVideoPlaying ? 'Pause ambient video' : 'Play ambient video'}
                >
                  {isVideoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              </div>

              <div className="space-y-1.5">
                {VIDEO_CHANNELS.map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => {
                      soundFX.playClick(620);
                      setSelectedChannel(channel);
                      setIsVideoPlaying(true);
                      setShowControls(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                      selectedChannel.id === channel.id
                        ? 'bg-purple-600/30 text-purple-200 font-bold border border-purple-500/40'
                        : 'text-[var(--text-faint)] hover:text-slate-200 hover:bg-[var(--bg-surface-elevated)]/60'
                    }`}
                  >
                    <span>{channel.name}</span>
                    {selectedChannel.id === channel.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
