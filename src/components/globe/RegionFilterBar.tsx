"use client";

import { useStore } from "@/store";

interface Region {
  label: string;
  shortLabel: string;
  longitude: number;
  latitude: number;
  altitude: number;
}

const REGIONS: Region[] = [
  { label: "World",          shortLabel: "WORLD",  longitude: 0,    latitude: 20,   altitude: 22_000_000 },
  { label: "Americas",       shortLabel: "AMER",   longitude: -80,  latitude: 15,   altitude: 12_000_000 },
  { label: "Europe",         shortLabel: "EUR",    longitude: 15,   latitude: 50,   altitude: 6_000_000  },
  { label: "Middle East",    shortLabel: "MENA",   longitude: 42,   latitude: 28,   altitude: 5_000_000  },
  { label: "Asia Pacific",   shortLabel: "APAC",   longitude: 115,  latitude: 25,   altitude: 10_000_000 },
  { label: "Africa",         shortLabel: "AFR",    longitude: 20,   latitude: 0,    altitude: 9_000_000  },
];

export default function RegionFilterBar() {
  const setFlyToTarget = useStore((s) => s.setFlyToTarget);

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5">
      {REGIONS.map((region) => (
        <button
          key={region.shortLabel}
          onClick={() => setFlyToTarget({ lat: region.latitude, lng: region.longitude, alt: region.altitude })}
          title={region.label}
          className="font-mono text-[8px] font-bold uppercase tracking-wider px-2 py-1 border border-border bg-surface/80 text-text-disabled hover:border-accent hover:text-accent hover:bg-accent-subtle transition-all backdrop-blur-sm"
        >
          {region.shortLabel}
        </button>
      ))}
    </div>
  );
}
