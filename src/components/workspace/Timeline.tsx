"use client";

import { useStore } from "@/store";

export function Timeline() {
  const isRecording = useStore((s) => s.isRecording);

  return (
    <footer className="flex items-center gap-2 h-[26px] px-2.5 bg-surface border-t border-border flex-shrink-0">
      {/* Controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span
          className={`text-[9px] uppercase tracking-widest ${
            isRecording ? "text-negative" : "text-text-disabled"
          }`}
        >
          REC
        </span>
        <span className="text-[9px] uppercase tracking-widest text-text-disabled">
          PLAY
        </span>
        <span className="text-[9px] uppercase tracking-widest text-text-disabled">
          1x
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex-1 h-[3px] bg-border-subtle relative">
        <div className="absolute left-0 top-0 h-full w-[65%] bg-accent/50" />
      </div>

      {/* Label */}
      <span className="text-[8px] uppercase tracking-widest text-text-disabled flex-shrink-0">
        4D TIMELINE
      </span>
    </footer>
  );
}

export default Timeline;
