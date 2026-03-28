"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store";

function utcTime(): string {
  const now = new Date();
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm} UTC`;
}

export function StatusArea() {
  const isRecording = useStore((s) => s.isRecording);
  const [clock, setClock] = useState<string>(() => utcTime());

  useEffect(() => {
    const id = setInterval(() => {
      setClock(utcTime());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2 text-[9px] flex-shrink-0">
      {/* LIVE indicator */}
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-positive inline-block" />
        <span className="text-positive">LIVE</span>
      </div>

      {/* Feed count */}
      <span className="text-text-disabled">42 FEEDS</span>

      {/* REC indicator — only when recording */}
      {isRecording && (
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-negative inline-block animate-pulse-status" />
          <span className="text-negative">REC</span>
        </div>
      )}

      {/* UTC clock */}
      <span className="text-text-disabled">{clock}</span>
    </div>
  );
}

export default StatusArea;
