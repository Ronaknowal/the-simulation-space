"use client";

import { useStore } from "@/store";
import { Circle, Square, Play, Trash2 } from "lucide-react";

export default function RecordingSidebarPanel() {
  const isRecording = useStore((s) => s.isRecording);
  const currentRecordingName = useStore((s) => s.currentRecordingName);
  const recordingStartTime = useStore((s) => s.recordingStartTime);
  const startRecording = useStore((s) => s.startRecording);
  const stopRecording = useStore((s) => s.stopRecording);
  const savedRecordings = useStore((s) => s.savedRecordings);
  const removeSavedRecording = useStore((s) => s.removeSavedRecording);
  const startReplay = useStore((s) => s.startReplay);
  const isReplaying = useStore((s) => s.isReplaying);

  const handleStart = () => {
    const name = `Session ${new Date().toLocaleTimeString()}`;
    startRecording(name);
  };

  const elapsed = isRecording && recordingStartTime
    ? Math.floor((Date.now() - recordingStartTime) / 1000)
    : 0;
  const elapsedStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col">
      {/* Recording controls */}
      <div className="px-3 py-3 border-b border-border-subtle">
        {isRecording ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-negative rounded-full animate-pulse" />
              <span className="text-[9px] text-negative font-bold uppercase tracking-widest">
                Recording
              </span>
              <span className="text-[9px] text-text-disabled font-mono ml-auto">{elapsedStr}</span>
            </div>
            <span className="text-[8px] text-text-disabled">{currentRecordingName}</span>
            <button
              onClick={stopRecording}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-negative/10 text-negative text-[9px] uppercase tracking-widest hover:bg-negative/20 transition-colors"
            >
              <Square size={10} /> Stop Recording
            </button>
          </div>
        ) : (
          <button
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-accent-subtle text-accent text-[9px] uppercase tracking-widest hover:bg-accent/20 transition-colors"
          >
            <Circle size={10} fill="currentColor" /> Start Recording
          </button>
        )}
      </div>

      {/* Saved recordings */}
      <div className="px-3 py-1.5 border-b border-border-subtle">
        <span className="text-[8px] text-text-disabled uppercase tracking-widest">
          Saved Recordings ({savedRecordings.length})
        </span>
      </div>

      {savedRecordings.length === 0 ? (
        <div className="flex items-center justify-center py-6 text-text-disabled text-[8px] uppercase tracking-widest">
          No recordings yet
        </div>
      ) : (
        savedRecordings.map((rec) => (
          <div
            key={rec.id}
            className="px-3 py-1.5 border-b border-border-subtle hover:bg-surface transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-text-primary flex-1 truncate">{rec.name}</span>
              <button
                onClick={() => {
                  if (rec.startTime && rec.endTime) {
                    startReplay(rec, { start: rec.startTime, end: rec.endTime });
                  }
                }}
                className="text-accent hover:text-accent/70"
                title="Replay"
              >
                <Play size={10} />
              </button>
              <button
                onClick={() => removeSavedRecording(rec.id)}
                className="text-text-disabled hover:text-negative"
                title="Delete"
              >
                <Trash2 size={10} />
              </button>
            </div>
            <span className="text-[7px] text-text-disabled">
              {new Date(rec.startTime || 0).toLocaleString()}
            </span>
          </div>
        ))
      )}

      {/* Info */}
      <div className="px-3 py-2">
        <p className="text-[8px] text-text-disabled leading-relaxed">
          4D Recording captures all active layer data to IndexedDB. Replay scrubs through time with layer overlays on the globe.
        </p>
      </div>
    </div>
  );
}
