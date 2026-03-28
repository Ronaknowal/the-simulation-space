export interface ConflictEvent {
  id: string;
  latitude: number;
  longitude: number;
  eventDate: string;
  eventType: string;
  fatalities: number;
  country: string;
  actor1: string;
  notes: string;
}

/**
 * Fetches armed conflict events via the local proxy API.
 *
 * ACLED (Armed Conflict Location & Event Data) requires an API key and
 * registered email: https://api.acleddata.com/acled/read?key=KEY&email=EMAIL&limit=5000
 *
 * This fetcher calls a local proxy route that handles authentication.
 * Falls back to curated conflict hotspot data when ACLED is unavailable.
 */
export async function fetchConflicts(): Promise<ConflictEvent[]> {
  try {
    const res = await fetch("/api/population/acled");
    if (res.ok) {
      const json = await res.json();
      const data = json.data || json;

      if (Array.isArray(data) && data.length > 0) {
        return data.map((d: any, idx: number) => ({
          id: d.data_id || d.event_id_cnty || `conflict-${idx}`,
          latitude: parseFloat(d.latitude) || 0,
          longitude: parseFloat(d.longitude) || 0,
          eventDate: d.event_date || "",
          eventType: d.event_type || "Strategic developments",
          fatalities: parseInt(d.fatalities) || 0,
          country: d.country || "",
          actor1: d.actor1 || "",
          notes: d.notes || "",
        }));
      }
    }
  } catch {
    // ACLED unavailable — use fallback
  }

  console.info("[Conflicts] ACLED unavailable, using curated fallback data");
  return generateFallbackConflicts();
}

/**
 * Curated conflict events based on publicly-known active conflict zones.
 * Provides visual coverage when ACLED API credentials are not configured.
 * Events are scattered within known conflict regions with realistic types.
 */
function generateFallbackConflicts(): ConflictEvent[] {
  const zones: Array<{
    lat: number;
    lon: number;
    country: string;
    actor: string;
    types: string[];
    spread: number;
    intensity: number; // avg fatalities multiplier
  }> = [
    // Eastern Europe
    {
      lat: 48.0, lon: 37.8, country: "Ukraine", actor: "Ukrainian Armed Forces",
      types: ["Battles", "Explosions/Remote violence", "Violence against civilians"],
      spread: 3, intensity: 5,
    },
    {
      lat: 47.0, lon: 35.0, country: "Ukraine", actor: "Ukrainian Armed Forces",
      types: ["Battles", "Explosions/Remote violence"],
      spread: 2, intensity: 3,
    },
    // Middle East
    {
      lat: 31.4, lon: 34.4, country: "Palestine", actor: "Israeli Forces",
      types: ["Battles", "Explosions/Remote violence", "Violence against civilians"],
      spread: 0.5, intensity: 8,
    },
    {
      lat: 33.9, lon: 35.8, country: "Lebanon", actor: "Hezbollah",
      types: ["Explosions/Remote violence", "Battles"],
      spread: 1, intensity: 3,
    },
    {
      lat: 36.2, lon: 37.2, country: "Syria", actor: "Syrian Armed Forces",
      types: ["Battles", "Explosions/Remote violence"],
      spread: 2, intensity: 4,
    },
    {
      lat: 33.3, lon: 44.4, country: "Iraq", actor: "Iraqi Security Forces",
      types: ["Battles", "Explosions/Remote violence"],
      spread: 2, intensity: 2,
    },
    {
      lat: 15.4, lon: 44.2, country: "Yemen", actor: "Houthi Forces",
      types: ["Battles", "Explosions/Remote violence", "Violence against civilians"],
      spread: 2, intensity: 4,
    },
    // Africa
    {
      lat: 15.6, lon: 32.5, country: "Sudan", actor: "Rapid Support Forces",
      types: ["Battles", "Violence against civilians", "Riots"],
      spread: 3, intensity: 6,
    },
    {
      lat: 8.0, lon: 38.7, country: "Ethiopia", actor: "Ethiopian National Defense Force",
      types: ["Battles", "Violence against civilians"],
      spread: 3, intensity: 3,
    },
    {
      lat: 2.0, lon: 45.3, country: "Somalia", actor: "Al-Shabaab",
      types: ["Battles", "Explosions/Remote violence", "Violence against civilians"],
      spread: 2, intensity: 4,
    },
    {
      lat: -2.5, lon: 28.8, country: "Democratic Republic of Congo", actor: "M23",
      types: ["Battles", "Violence against civilians"],
      spread: 2, intensity: 5,
    },
    {
      lat: 12.0, lon: -1.5, country: "Burkina Faso", actor: "JNIM",
      types: ["Battles", "Explosions/Remote violence", "Violence against civilians"],
      spread: 2, intensity: 4,
    },
    {
      lat: 14.0, lon: -3.0, country: "Mali", actor: "Malian Armed Forces",
      types: ["Battles", "Violence against civilians"],
      spread: 2, intensity: 3,
    },
    {
      lat: 9.1, lon: 7.5, country: "Nigeria", actor: "Boko Haram",
      types: ["Battles", "Explosions/Remote violence", "Violence against civilians"],
      spread: 3, intensity: 4,
    },
    {
      lat: -8.8, lon: 13.2, country: "Angola", actor: "FLEC",
      types: ["Battles", "Strategic developments"],
      spread: 1, intensity: 1,
    },
    // South/Central Asia
    {
      lat: 34.5, lon: 69.2, country: "Afghanistan", actor: "Taliban",
      types: ["Battles", "Explosions/Remote violence", "Violence against civilians"],
      spread: 3, intensity: 4,
    },
    {
      lat: 34.0, lon: 72.0, country: "Pakistan", actor: "TTP",
      types: ["Explosions/Remote violence", "Battles"],
      spread: 2, intensity: 2,
    },
    {
      lat: 19.0, lon: 96.0, country: "Myanmar", actor: "Myanmar Military",
      types: ["Battles", "Violence against civilians", "Riots"],
      spread: 3, intensity: 3,
    },
    // Americas
    {
      lat: 19.4, lon: -99.1, country: "Mexico", actor: "Drug cartels",
      types: ["Battles", "Violence against civilians"],
      spread: 4, intensity: 3,
    },
    {
      lat: 4.6, lon: -74.1, country: "Colombia", actor: "ELN",
      types: ["Battles", "Violence against civilians"],
      spread: 2, intensity: 2,
    },
    {
      lat: 18.5, lon: -72.3, country: "Haiti", actor: "Armed gangs",
      types: ["Battles", "Violence against civilians", "Riots"],
      spread: 0.5, intensity: 3,
    },
  ];

  const today = new Date().toISOString().slice(0, 10);
  const events: ConflictEvent[] = [];
  let idCounter = 0;

  for (const zone of zones) {
    // Generate 5-15 events per zone, more for higher-intensity conflicts
    const count = 5 + Math.floor(Math.random() * zone.intensity * 2);
    for (let i = 0; i < count; i++) {
      const jLat = (Math.random() - 0.5) * zone.spread * 2;
      const jLon = (Math.random() - 0.5) * zone.spread * 2;
      const type = zone.types[Math.floor(Math.random() * zone.types.length)];
      const fatalities =
        type === "Battles"
          ? Math.floor(Math.random() * zone.intensity * 3)
          : type === "Violence against civilians"
          ? Math.floor(Math.random() * zone.intensity * 2)
          : type === "Explosions/Remote violence"
          ? Math.floor(Math.random() * zone.intensity * 4)
          : 0;

      events.push({
        id: `conflict-fallback-${idCounter++}`,
        latitude: zone.lat + jLat,
        longitude: zone.lon + jLon,
        eventDate: today,
        eventType: type,
        fatalities,
        country: zone.country,
        actor1: zone.actor,
        notes: `${type} in ${zone.country}`,
      });
    }
  }

  return events;
}
