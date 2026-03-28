"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/store";
import { Circle, Play, Pause, SkipForward } from "lucide-react";

// Track definitions
const TRACKS = [
  { id: "events", label: "Events", color: "#e74c3c" },
  { id: "markets", label: "Markets", color: "#2ecc71" },
  { id: "alerts", label: "Alerts", color: "#d4952b" },
  { id: "sims", label: "Sims", color: "#4a9aba" },
] as const;

const SPEED_OPTIONS = [0.5, 1, 2, 5, 10, 20] as const;

// Deterministic mock segments per track (seeded by track index)
function getMockSegments(trackIndex: number): { start: number; end: number }[] {
  const segs: { start: number; end: number }[] = [];
  // Use a simple deterministic pattern based on track index
  const offsets = [
    [0.05, 0.18, 0.35, 0.55, 0.72, 0.88],
    [0.1, 0.28, 0.42, 0.60, 0.80, 0.92],
    [0.03, 0.22, 0.38, 0.50, 0.66, 0.85],
    [0.08, 0.30, 0.48, 0.62, 0.76, 0.90],
  ];
  const widths = [
    [0.08, 0.06, 0.07, 0.09, 0.05, 0.06],
    [0.10, 0.05, 0.08, 0.07, 0.06, 0.04],
    [0.09, 0.07, 0.05, 0.08, 0.10, 0.05],
    [0.06, 0.08, 0.07, 0.05, 0.09, 0.06],
  ];
  const starts = offsets[trackIndex % offsets.length];
  const ws = widths[trackIndex % widths.length];
  for (let i = 0; i < starts.length; i++) {
    segs.push({ start: starts[i], end: Math.min(starts[i] + ws[i], 1) });
  }
  return segs;
}

function formatTimeRange(start: number, end: number): string {
  const diffMs = end - start;
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours >= 1) {
    return `${Math.round(diffHours)}h ago → now`;
  }
  const diffMins = diffMs / (1000 * 60);
  return `${Math.round(diffMins)}m ago → now`;
}

export default function Timeline() {
  const isRecording = useStore((s) => s.isRecording);
  const isPlaying = useStore((s) => s.isPlaying);
  const playbackSpeed = useStore((s) => s.playbackSpeed);
  const currentTime = useStore((s) => s.currentTime);
  const timeRange = useStore((s) => s.timeRange);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const setPlaybackSpeed = useStore((s) => s.setPlaybackSpeed);
  const setCurrentTime = useStore((s) => s.setCurrentTime);
  const startRecording = useStore((s) => s.startRecording);
  const stopRecording = useStore((s) => s.stopRecording);

  const [hiddenTracks, setHiddenTracks] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  const scrubberRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  // Playback advance
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const tick = () => {
      const now = Date.now();
      const deltaMs = (now - lastTickRef.current) * playbackSpeed;
      lastTickRef.current = now;

      setCurrentTime(Math.min(currentTime + deltaMs, timeRange.end));

      animFrameRef.current = requestAnimationFrame(tick);
    };

    lastTickRef.current = Date.now();
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, playbackSpeed, timeRange.end]);

  // Clamp if playback reaches end
  useEffect(() => {
    if (currentTime >= timeRange.end && isPlaying) {
      setIsPlaying(false);
      setCurrentTime(timeRange.end);
    }
  }, [currentTime, timeRange.end, isPlaying, setIsPlaying, setCurrentTime]);

  const getPositionFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!scrubberRef.current) return null;
      const rect = scrubberRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const ratio = x / rect.width;
      return timeRange.start + ratio * (timeRange.end - timeRange.start);
    },
    [timeRange]
  );

  const handleBarClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) return;
      const t = getPositionFromEvent(e);
      if (t !== null) setCurrentTime(t);
    },
    [isDragging, getPositionFromEvent, setCurrentTime]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const onMove = (ev: MouseEvent) => {
        const t = getPositionFromEvent(ev);
        if (t !== null) setCurrentTime(t);
      };
      const onUp = () => {
        setIsDragging(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [getPositionFromEvent, setCurrentTime]
  );

  const toggleRecord = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      const dateStr = new Date().toISOString().slice(0, 16).replace("T", " ");
      startRecording(`Session ${dateStr}`);
    }
  }, [isRecording, startRecording, stopRecording]);

  const cycleSpeed = useCallback(() => {
    const idx = SPEED_OPTIONS.indexOf(playbackSpeed as typeof SPEED_OPTIONS[number]);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setPlaybackSpeed(next);
  }, [playbackSpeed, setPlaybackSpeed]);

  const toggleTrack = useCallback((id: string) => {
    setHiddenTracks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const progress =
    timeRange.end > timeRange.start
      ? (currentTime - timeRange.start) / (timeRange.end - timeRange.start)
      : 0;
  const clampedProgress = Math.max(0, Math.min(1, progress));

  const timeRangeLabel = formatTimeRange(timeRange.start, timeRange.end);

  return (
    <footer className="flex items-center gap-0 h-[48px] bg-surface border-t border-border flex-shrink-0 overflow-hidden">
      {/* Controls section */}
      <div className="flex items-center gap-2 px-2.5 flex-shrink-0 h-full border-r border-border">
        {/* Record button */}
        <button
          onClick={toggleRecord}
          className="flex items-center gap-1 group"
          title={isRecording ? "Stop recording" : "Start recording"}
        >
          <Circle
            size={7}
            className={`transition-all ${
              isRecording
                ? "fill-negative text-negative animate-pulse"
                : "fill-text-disabled text-text-disabled group-hover:fill-negative group-hover:text-negative"
            }`}
          />
          <span
            className={`text-[9px] uppercase tracking-widest ${
              isRecording
                ? "text-negative"
                : "text-text-disabled group-hover:text-text-secondary"
            }`}
          >
            REC
          </span>
        </button>

        {/* Play/Pause button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="flex items-center gap-1 group"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause size={8} className="text-accent" />
          ) : (
            <Play size={8} className="text-text-disabled group-hover:text-text-secondary" />
          )}
          <span
            className={`text-[9px] uppercase tracking-widest ${
              isPlaying
                ? "text-accent"
                : "text-text-disabled group-hover:text-text-secondary"
            }`}
          >
            {isPlaying ? "PAUSE" : "PLAY"}
          </span>
        </button>

        {/* Speed selector */}
        <button
          onClick={cycleSpeed}
          className="text-[9px] uppercase tracking-widest text-text-disabled hover:text-text-secondary transition-colors min-w-[24px] text-left"
          title="Cycle playback speed"
        >
          {playbackSpeed === 0.5 ? "0.5x" : `${playbackSpeed}x`}
        </button>
      </div>

      {/* Timeline bar section */}
      <div className="flex-1 flex flex-col justify-center gap-[2px] px-2 h-full min-w-0">
        {/* Main scrubber bar */}
        <div
          ref={scrubberRef}
          className="relative h-[6px] bg-border rounded-sm cursor-pointer group"
          onClick={handleBarClick}
        >
          {/* Progress fill */}
          <div
            className="absolute left-0 top-0 h-full bg-accent/40 rounded-sm pointer-events-none"
            style={{ width: `${clampedProgress * 100}%` }}
          />

          {/* Scrubber handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[8px] h-[8px] bg-accent rounded-full cursor-grab active:cursor-grabbing shadow-sm z-10 hover:scale-125 transition-transform"
            style={{ left: `${clampedProgress * 100}%` }}
            onMouseDown={handleMouseDown}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Track bands */}
        <div className="flex flex-col gap-[1px]">
          {TRACKS.map((track, idx) => {
            const isHidden = hiddenTracks.has(track.id);
            const segments = getMockSegments(idx);
            return (
              <div
                key={track.id}
                className="relative h-[3px] bg-border/30 rounded-sm overflow-hidden"
                style={{ opacity: isHidden ? 0.2 : 1 }}
              >
                {segments.map((seg, si) => (
                  <div
                    key={si}
                    className="absolute top-0 h-full rounded-sm"
                    style={{
                      left: `${seg.start * 100}%`,
                      width: `${(seg.end - seg.start) * 100}%`,
                      backgroundColor: track.color,
                      opacity: 0.7,
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Time label and track legend */}
      <div className="flex flex-col items-end justify-center gap-1 px-2.5 flex-shrink-0 h-full border-l border-border min-w-[90px]">
        {/* Time range label */}
        <span className="text-[8px] uppercase tracking-widest text-text-disabled whitespace-nowrap">
          {timeRangeLabel}
        </span>

        {/* Track legend */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {TRACKS.map((track) => {
            const isHidden = hiddenTracks.has(track.id);
            return (
              <button
                key={track.id}
                onClick={() => toggleTrack(track.id)}
                className="flex items-center gap-0.5 group"
                title={isHidden ? `Show ${track.label}` : `Hide ${track.label}`}
                style={{ opacity: isHidden ? 0.3 : 1 }}
              >
                <span
                  className="w-[5px] h-[5px] rounded-full flex-shrink-0"
                  style={{ backgroundColor: track.color }}
                />
                <span className="text-[7px] uppercase tracking-widest text-text-disabled group-hover:text-text-secondary transition-colors">
                  {track.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
