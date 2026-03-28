"use client";

import { useEffect, useRef, useState } from "react";

interface AIProgressProps {
  isRunning: boolean;
  phase: string;
  progress: number; // 0-1
  model?: string;
  agentCount?: number;
  elapsed?: number; // seconds
}

export default function AIProgressIndicator({
  isRunning,
  phase,
  progress,
  model,
  agentCount,
  elapsed,
}: AIProgressProps) {
  // Live elapsed counter when running
  const [liveElapsed, setLiveElapsed] = useState(elapsed ?? 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setLiveElapsed(elapsed ?? 0);
  }, [elapsed]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setLiveElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  if (!isRunning) return null;

  const pct = Math.min(Math.max(progress, 0), 1) * 100;

  return (
    <div className="px-3 py-2 border-b border-border-subtle flex-shrink-0 bg-surface">
      {/* Top row: phase text + elapsed + model badge */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-accent text-[9px] tracking-wide animate-pulse">
          {agentCount != null
            ? `${phase} ${agentCount.toLocaleString()} agents...`
            : `${phase}...`}
        </span>
        <div className="flex items-center gap-2">
          {model && (
            <span className="text-[7px] text-text-disabled uppercase tracking-widest border border-border px-1 py-0.5">
              {model}
            </span>
          )}
          <span className="text-[8px] text-text-disabled font-mono">{liveElapsed}s</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] bg-border overflow-hidden relative">
        <div
          className="h-full bg-accent transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            boxShadow: "0 0 6px var(--color-accent)",
          }}
        />
      </div>
    </div>
  );
}
