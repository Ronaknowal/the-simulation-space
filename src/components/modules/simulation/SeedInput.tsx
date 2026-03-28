"use client";

import { useState, useCallback } from "react";

const SECTORS = [
  "Geopolitical",
  "Financial",
  "Supply Chain",
  "Defense",
  "Technology",
  "Energy",
  "Agriculture",
] as const;

const DURATIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hr", value: 60 },
  { label: "2 hr", value: 120 },
] as const;

interface SeedInputProps {
  onRun: (seed: string, config: { agentCount: number; durationMinutes: number; focusSectors: string[] }) => void;
  isRunning: boolean;
}

export default function SeedInput({ onRun, isRunning }: SeedInputProps) {
  const [seed, setSeed] = useState("");
  const [agentCount, setAgentCount] = useState(500);
  const [duration, setDuration] = useState(30);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);

  const toggleSector = useCallback((sector: string) => {
    setSelectedSectors((prev) =>
      prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector]
    );
  }, []);

  const handleRun = useCallback(() => {
    if (!seed.trim() || isRunning) return;
    onRun(seed.trim(), {
      agentCount,
      durationMinutes: duration,
      focusSectors: selectedSectors.length > 0 ? selectedSectors : [...SECTORS],
    });
  }, [seed, agentCount, duration, selectedSectors, isRunning, onRun]);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Seed textarea */}
      <textarea
        value={seed}
        onChange={(e) => setSeed(e.target.value)}
        placeholder="Describe the event to simulate..."
        className="w-full flex-1 min-h-[120px] resize-none bg-card border border-border text-text-primary font-mono text-[11px] leading-relaxed p-3 placeholder:text-text-disabled focus:outline-none focus:border-accent transition-colors"
      />

      {/* Config row */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Agent count */}
        <div className="flex flex-col gap-1">
          <label className="text-[8px] uppercase tracking-widest text-text-disabled">
            Agent Count
          </label>
          <input
            type="number"
            min={100}
            max={2000}
            step={50}
            value={agentCount}
            onChange={(e) => setAgentCount(Math.min(2000, Math.max(100, Number(e.target.value))))}
            className="w-[80px] bg-card border border-border text-text-primary font-mono text-[10px] px-2 py-1 focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Duration */}
        <div className="flex flex-col gap-1">
          <label className="text-[8px] uppercase tracking-widest text-text-disabled">
            Duration
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="bg-card border border-border text-text-primary font-mono text-[10px] px-2 py-1 focus:outline-none focus:border-accent transition-colors"
          >
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Focus sectors */}
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[8px] uppercase tracking-widest text-text-disabled">
            Focus Sectors
          </label>
          <div className="flex flex-wrap gap-1">
            {SECTORS.map((sector) => {
              const active = selectedSectors.includes(sector);
              return (
                <button
                  key={sector}
                  onClick={() => toggleSector(sector)}
                  className={`px-2 py-0.5 text-[8px] uppercase tracking-wider border transition-colors ${
                    active
                      ? "bg-accent text-bg border-accent"
                      : "bg-transparent text-text-secondary border-border hover:border-accent hover:text-accent"
                  }`}
                >
                  {sector}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={isRunning || !seed.trim()}
        className={`w-full py-2 font-bold uppercase text-[11px] tracking-widest transition-all ${
          isRunning
            ? "bg-accent/20 text-accent border border-accent/30 cursor-not-allowed animate-pulse-status"
            : seed.trim()
            ? "bg-accent text-bg border border-accent hover:bg-accent/90 cursor-pointer"
            : "bg-card text-text-disabled border border-border cursor-not-allowed"
        }`}
      >
        {isRunning ? "Simulation Running..." : "Run Simulation"}
      </button>
    </div>
  );
}
