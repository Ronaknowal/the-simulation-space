/**
 * Rich HTML tooltips for every pickable deck.gl layer in The Simulation Space.
 *
 * Each layer type gets a dedicated formatter that renders the layer's
 * metadata into styled HTML matching the platform's dark theme.
 *
 * Usage: called from DeckOverlay's getTooltip callback. The layer ID
 * is extracted from `info.layer.id` (preserved through projection) and
 * the original data object is unwrapped from `object._orig || object`.
 */

// ── Shared tooltip styling ───────────────────────────────────────────

const TOOLTIP_STYLE: Record<string, string> = {
  backgroundColor: "rgba(10, 10, 15, 0.95)",
  color: "#e2e8f0",
  fontSize: "12px",
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  padding: "0",
  borderRadius: "6px",
  border: "1px solid rgba(59, 130, 246, 0.4)",
  boxShadow: "0 0 12px rgba(59, 130, 246, 0.15), 0 4px 16px rgba(0, 0, 0, 0.5)",
  maxWidth: "320px",
  lineHeight: "1.5",
  pointerEvents: "none",
};

// ── Utility helpers ──────────────────────────────────────────────────

function esc(val: unknown): string {
  if (val === null || val === undefined) return "N/A";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: string, color?: string): string {
  const valStyle = color ? ` style="color:${color}"` : "";
  return `<tr><td style="color:#94a3b8;padding:1px 8px 1px 0;white-space:nowrap">${label}</td><td${valStyle}>${value}</td></tr>`;
}

function header(icon: string, title: string, accent: string): string {
  return `<div style="padding:6px 10px;border-bottom:1px solid rgba(59,130,246,0.2);background:linear-gradient(135deg,rgba(${accent},0.15),transparent);border-radius:5px 5px 0 0;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#cbd5e1">${icon} ${esc(title)}</div>`;
}

function body(rows: string): string {
  return `<div style="padding:6px 10px"><table style="border-spacing:0;font-size:12px">${rows}</table></div>`;
}

function tooltip(html: string): { html: string; style: Record<string, string> } {
  return { html, style: TOOLTIP_STYLE };
}

/** Format large numbers with K/M/B/T suffixes */
function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "N/A";
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(n % 1 === 0 ? 0 : 1);
}

/** Format a unix-ms timestamp to a relative time string */
function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 0) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

/** WMO weather code to human-readable condition */
function wmoToCondition(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code >= 56 && code <= 57) return "Freezing drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 66 && code <= 67) return "Freezing rain";
  if (code >= 71 && code <= 75) return "Snow";
  if (code === 77) return "Snow grains";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code >= 96 && code <= 99) return "Thunderstorm + hail";
  return `Code ${code}`;
}

/** Magnitude to a semantic color hex */
function magColor(mag: number): string {
  if (mag >= 7) return "#ef4444";
  if (mag >= 5) return "#f97316";
  if (mag >= 3) return "#facc15";
  return "#4ade80";
}

/** Wind direction degrees to compass bearing */
function degToCompass(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16] || `${deg}\u00B0`;
}

/** AIS ship type code to human-readable category */
function shipCategory(type: number): string {
  if (type >= 70 && type <= 79) return "Cargo";
  if (type >= 80 && type <= 89) return "Tanker";
  if (type >= 60 && type <= 69) return "Passenger";
  if (type === 30) return "Fishing";
  if (type >= 35 && type <= 36) return "Military";
  if (type === 37) return "Pleasure";
  if (type >= 31 && type <= 32) return "Tug";
  return "Other";
}

/** Airport type to human-readable label */
function airportTypeLabel(type: string): string {
  switch (type) {
    case "large_airport": return "Large";
    case "medium_airport": return "Medium";
    case "small_airport": return "Small";
    case "heliport": return "Heliport";
    case "seaplane_base": return "Seaplane";
    default: return type;
  }
}

/** Radiation level to semantic label */
function radiationLabel(usvh: number): { label: string; color: string } {
  if (usvh < 0.3) return { label: "Normal", color: "#4ade80" };
  if (usvh < 1) return { label: "Elevated", color: "#facc15" };
  if (usvh < 5) return { label: "High", color: "#f97316" };
  return { label: "DANGEROUS", color: "#ef4444" };
}

/** Bleaching risk to color */
function bleachingColor(risk: string): string {
  switch (risk) {
    case "low": return "#4ade80";
    case "medium": return "#facc15";
    case "high": return "#f97316";
    case "critical": return "#ef4444";
    default: return "#94a3b8";
  }
}

/** Goldstein scale to descriptive label and color */
function goldsteinLabel(scale: number): { label: string; color: string } {
  if (scale < -5) return { label: "Heavy conflict", color: "#ef4444" };
  if (scale < 0) return { label: "Mild conflict", color: "#f97316" };
  if (scale < 5) return { label: "Neutral / positive", color: "#facc15" };
  return { label: "Cooperation", color: "#4ade80" };
}


// ── Per-layer tooltip formatters ─────────────────────────────────────

type Formatter = (d: any) => { html: string; style: Record<string, string> };

const formatters: Record<string, Formatter> = {

  // ─── Aviation ────────────────────────────────────────────────────
  "aviation-commercial-flights": (d) => {
    const callsign = (d.flight || "").trim() || "N/A";
    const alt = typeof d.alt_baro === "number" ? `${d.alt_baro.toLocaleString()} ft` : "N/A";
    const speed = d.gs != null ? `${Math.round(d.gs)} kts` : "N/A";
    const hdg = d.track != null ? `${Math.round(d.track)}\u00B0` : "N/A";
    const type = d.t || d.type || "N/A";
    const reg = d.r || "N/A";
    const squawk = d.squawk || "";
    const squawkRow = squawk ? row("Squawk", esc(squawk), squawk === "7700" || squawk === "7600" || squawk === "7500" ? "#ef4444" : undefined) : "";
    return tooltip(
      header("\u2708\uFE0F", `Flight ${callsign}`, "59,130,246") +
      body(
        row("Type", esc(type)) +
        row("Altitude", alt) +
        row("Speed", speed) +
        row("Heading", hdg) +
        row("Registration", esc(reg)) +
        squawkRow
      )
    );
  },

  "aviation-military-flights": (d) => {
    const callsign = (d.flight || "").trim() || "N/A";
    const alt = typeof d.alt_baro === "number" ? `${d.alt_baro.toLocaleString()} ft` : "N/A";
    const speed = d.gs != null ? `${Math.round(d.gs)} kts` : "N/A";
    const type = d.t || d.type || "N/A";
    const reg = d.r || "N/A";
    return tooltip(
      header("\uD83C\uDF96\uFE0F", `Military ${callsign}`, "249,115,22") +
      body(
        row("Type", esc(type)) +
        row("Altitude", alt) +
        row("Speed", speed) +
        row("Registration", esc(reg)) +
        row("ICAO Hex", esc(d.hex))
      )
    );
  },

  // ─── Seismic ─────────────────────────────────────────────────────
  "seismic-earthquakes": (d) => {
    const mag = d.magnitude ?? 0;
    const mc = magColor(mag);
    const depth = d.depth != null ? `${d.depth.toFixed(1)} km` : "N/A";
    const time = d.time ? timeAgo(d.time) : "N/A";
    const place = d.place || "Unknown";
    const tsunamiRow = d.tsunami ? row("Tsunami", "YES", "#ef4444") : "";
    const alertRow = d.alert ? row("Alert", esc(d.alert.toUpperCase()), d.alert === "red" ? "#ef4444" : d.alert === "orange" ? "#f97316" : "#facc15") : "";
    const feltRow = d.felt ? row("Felt by", `${d.felt} reports`) : "";
    return tooltip(
      header("\uD83C\uDF0B", `M${mag.toFixed(1)} Earthquake`, "239,68,68") +
      body(
        row("Magnitude", `<strong style="color:${mc}">${mag.toFixed(1)}</strong>`) +
        row("Location", esc(place)) +
        row("Depth", depth) +
        row("Time", time) +
        tsunamiRow +
        alertRow +
        feltRow
      )
    );
  },

  "seismic-volcanoes": (d) => {
    const status = d.status || "Unknown";
    const statusColor = status === "Historical" ? "#ef4444" : status === "Holocene" ? "#f97316" : "#facc15";
    return tooltip(
      header("\uD83C\uDF0B", d.name || "Volcano", "249,115,22") +
      body(
        row("Country", esc(d.country)) +
        row("Elevation", d.elevation ? `${d.elevation.toLocaleString()} m` : "N/A") +
        row("Type", esc(d.type || "Unknown")) +
        row("Status", esc(status), statusColor) +
        row("Last eruption", esc(d.lastEruption))
      )
    );
  },

  "seismic-tsunamis": (d) => {
    const alertColors: Record<string, string> = {
      Warning: "#ef4444", Watch: "#f97316", Advisory: "#facc15", Information: "#60a5fa",
    };
    const lvl = d.alertLevel || "Information";
    return tooltip(
      header("\uD83C\uDF0A", "Tsunami Alert", "56,189,248") +
      body(
        row("Alert level", esc(lvl), alertColors[lvl] || "#94a3b8") +
        row("Magnitude", d.magnitude ? `M${d.magnitude.toFixed(1)}` : "N/A") +
        row("Location", esc(d.location || "Unknown")) +
        row("Time", d.time ? timeAgo(d.time) : "N/A") +
        row("Source", esc(d.source || "N/A"))
      )
    );
  },

  // ─── Satellites ──────────────────────────────────────────────────
  "satellites-active": (d) => {
    const orbitColors: Record<string, string> = { LEO: "#60a5fa", MEO: "#34d399", GEO: "#facc15", HEO: "#f43e5e" };
    const ot = d.orbitType || "Unknown";
    return tooltip(
      header("\uD83D\uDEF0\uFE0F", d.name || "Satellite", "96,165,250") +
      body(
        row("NORAD ID", String(d.noradId || "N/A")) +
        row("Orbit", esc(ot), orbitColors[ot]) +
        row("Altitude", d.altitude != null ? `${Math.round(d.altitude).toLocaleString()} km` : "N/A") +
        (d.velocity != null ? row("Velocity", `${d.velocity.toFixed(1)} km/s`) : "")
      )
    );
  },

  "satellites-iss-position": (d) => {
    return tooltip(
      header("\uD83D\uDE80", "International Space Station", "0,200,255") +
      body(
        row("Altitude", d.altitude != null ? `${Math.round(d.altitude)} km` : "N/A") +
        row("Velocity", d.velocity != null ? `${d.velocity.toFixed(2)} km/s` : "N/A")
      )
    );
  },

  "satellites-debris": (d) => {
    return tooltip(
      header("\u26A0\uFE0F", d.name || "Space Debris", "239,68,68") +
      body(
        row("NORAD ID", String(d.noradId || "N/A")) +
        row("Altitude", d.altitude != null ? `${Math.round(d.altitude).toLocaleString()} km` : "N/A")
      )
    );
  },

  // ─── Weather ─────────────────────────────────────────────────────
  "weather-current": (d) => {
    const temp = d.temperature;
    const tempColor = temp <= 0 ? "#93c5fd" : temp <= 10 ? "#4ade80" : temp <= 25 ? "#facc15" : temp <= 35 ? "#fb923c" : "#ef4444";
    const condition = wmoToCondition(d.weatherCode);
    const dayNight = d.isDay ? "Day" : "Night";
    return tooltip(
      header("\u2600\uFE0F", "Current Weather", "250,204,21") +
      body(
        row("Temperature", `<strong style="color:${tempColor}">${temp.toFixed(1)}\u00B0C</strong>`) +
        row("Conditions", esc(condition)) +
        row("Humidity", `${Math.round(d.humidity)}%`) +
        row("Wind", `${d.windSpeed.toFixed(1)} km/h ${degToCompass(d.windDirection)}`) +
        row("Day/Night", dayNight)
      )
    );
  },

  "weather-lightning": (d) => {
    const time = d.time ? timeAgo(d.time) : "N/A";
    const polarity = d.polarity > 0 ? "Positive (+)" : d.polarity < 0 ? "Negative (-)" : "Unknown";
    return tooltip(
      header("\u26A1", "Lightning Strike", "255,255,100") +
      body(
        row("Time", time) +
        row("Polarity", polarity) +
        row("Lat", d.latitude?.toFixed(3) || "N/A") +
        row("Lon", d.longitude?.toFixed(3) || "N/A")
      )
    );
  },

  "weather-wind-particles": (d) => {
    const speed = d.windSpeed ?? 0;
    const label = speed < 2 ? "Calm" : speed < 5 ? "Light" : speed < 10 ? "Moderate" : speed < 15 ? "Fresh" : speed < 25 ? "Strong" : "Storm";
    return tooltip(
      header("\uD83D\uDCA8", "Wind", "148,163,184") +
      body(
        row("Speed", `${speed.toFixed(1)} m/s`) +
        row("Direction", `${degToCompass(d.windDirection || 0)} (${Math.round(d.windDirection || 0)}\u00B0)`) +
        row("Category", label)
      )
    );
  },

  // ─── Environmental ───────────────────────────────────────────────
  "environmental-wildfires": (d) => {
    const conf = d.confidence ?? 0;
    const confColor = conf >= 80 ? "#ef4444" : conf >= 50 ? "#f97316" : "#facc15";
    return tooltip(
      header("\uD83D\uDD25", "Wildfire Hotspot", "249,115,22") +
      body(
        row("FRP", `${d.frp?.toFixed(1) || 0} MW`) +
        row("Brightness", `${d.brightness?.toFixed(1) || "N/A"} K`) +
        row("Confidence", `<span style="color:${confColor}">${conf}%</span>`) +
        row("Satellite", esc(d.satellite || "N/A")) +
        row("Acquired", esc(d.acqDate ? `${d.acqDate} ${d.acqTime || ""}`.trim() : "N/A"))
      )
    );
  },

  "environmental-coral-reefs": (d) => {
    const risk = d.bleachingRisk || "unknown";
    return tooltip(
      header("\uD83E\uDEB8", d.name || "Coral Reef", "16,185,129") +
      body(
        row("Country", esc(d.country || "N/A")) +
        row("Area", d.area ? `${fmtNum(d.area)} km\u00B2` : "N/A") +
        row("Bleaching risk", esc(risk.charAt(0).toUpperCase() + risk.slice(1)), bleachingColor(risk))
      )
    );
  },

  "environmental-ocean-currents": (d) => {
    return tooltip(
      header("\uD83C\uDF0A", "Ocean Current", "56,189,248") +
      body(
        row("Speed", `${d.speed?.toFixed(2) || "N/A"} m/s`) +
        row("U component", `${d.u?.toFixed(2) || "N/A"} m/s`) +
        row("V component", `${d.v?.toFixed(2) || "N/A"} m/s`)
      )
    );
  },

  // ─── Maritime ────────────────────────────────────────────────────
  "maritime-ais-ships": (d) => {
    const shipName = d.name || "Unknown Vessel";
    const cat = shipCategory(d.shipType || 0);
    return tooltip(
      header("\uD83D\uDEA2", shipName, "59,130,246") +
      body(
        row("MMSI", String(d.mmsi || "N/A")) +
        row("Type", `${cat} (${d.shipType || 0})`) +
        row("Speed", d.speed != null ? `${d.speed.toFixed(1)} kts` : "N/A") +
        row("Course", d.course != null ? `${Math.round(d.course)}\u00B0` : "N/A") +
        row("Heading", d.heading != null ? `${Math.round(d.heading)}\u00B0` : "N/A") +
        row("Destination", esc(d.destination || "N/A"))
      )
    );
  },

  "maritime-submarine-cables": (d) => {
    // GeoJSON PathLayer pick: d may be a path segment { path, color }
    // For submarine cables, properties come from the GeoJSON features
    // The data flowing through projectGeoJsonLayer is the feature properties
    const props = d.properties || d;
    return tooltip(
      header("\uD83D\uDCE1", props.name || "Submarine Cable", "6,182,212") +
      body(
        row("Owners", esc(props.owners || "N/A")) +
        row("Length", esc(props.length || "N/A")) +
        (props.year ? row("Year", String(props.year)) : "")
      )
    );
  },

  "maritime-fishing-activity": (d) => {
    return tooltip(
      header("\uD83C\uDFA3", "Fishing Activity", "16,185,129") +
      body(
        row("Hours", `${d.hours?.toFixed(1) || "N/A"} h`) +
        row("Flag state", esc(d.flagState || "N/A")) +
        row("Gear type", esc(d.gearType || "N/A")) +
        row("Date", esc(d.date || "N/A"))
      )
    );
  },

  "maritime-dark-vessels": (d) => {
    const riskColors: Record<string, string> = { high: "#ef4444", medium: "#f97316", low: "#facc15" };
    const risk = d.riskLevel || "unknown";
    return tooltip(
      header("\uD83D\uDEA8", "Dark Vessel", "239,68,68") +
      body(
        row("Risk level", esc(risk.toUpperCase()), riskColors[risk]) +
        row("AIS gap", d.gapHours != null ? `${d.gapHours}h` : "N/A") +
        row("Last seen", d.lastSeen ? timeAgo(d.lastSeen) : "N/A")
      )
    );
  },

  // ─── Infrastructure ──────────────────────────────────────────────
  "infrastructure-airports": (d) => {
    const iata = d.iataCode || "N/A";
    return tooltip(
      header("\u2708\uFE0F", d.name || "Airport", "59,130,246") +
      body(
        row("IATA", esc(iata)) +
        row("ICAO", esc(d.ident || "N/A")) +
        row("Type", airportTypeLabel(d.type || "")) +
        row("Elevation", d.elevation ? `${d.elevation.toLocaleString()} ft` : "N/A") +
        row("Country", esc(d.country || "N/A")) +
        row("Municipality", esc(d.municipality || "N/A"))
      )
    );
  },

  "infrastructure-power-plants": (d) => {
    const fuelColors: Record<string, string> = {
      coal: "#64748b", gas: "#f97316", "natural gas": "#f97316", oil: "#78502e",
      nuclear: "#a855f7", hydro: "#38bdf8", hydroelectric: "#38bdf8",
      wind: "#10b981", solar: "#facc15",
    };
    const fuel = d.primaryFuel || "Other";
    const fc = fuelColors[fuel.toLowerCase()] || "#94a3b8";
    return tooltip(
      header("\u26A1", d.name || "Power Plant", "250,204,21") +
      body(
        row("Fuel", `<span style="color:${fc}">${esc(fuel)}</span>`) +
        row("Capacity", d.capacity ? `${fmtNum(d.capacity)} MW` : "N/A") +
        row("Country", esc(d.country || "N/A")) +
        row("Owner", esc(d.owner || "N/A")) +
        (d.commissioning_year ? row("Year", String(d.commissioning_year)) : "")
      )
    );
  },

  "infrastructure-railways": (d) => {
    // GeoJSON layer — properties from feature
    const props = d.properties || d;
    return tooltip(
      header("\uD83D\uDE82", props.name || "Railway", "148,163,184") +
      body(
        row("Operator", esc(props.operator || "N/A")) +
        (props.maxspeed ? row("Max speed", esc(props.maxspeed)) : "") +
        (props.electrified ? row("Electrified", esc(props.electrified)) : "")
      )
    );
  },

  "infrastructure-cell-towers": (d) => {
    const radioColors: Record<string, string> = { NR: "#a855f7", LTE: "#3b82f6", UMTS: "#64c8ff", GSM: "#c8c8c8" };
    const radio = d.radio || "Unknown";
    return tooltip(
      header("\uD83D\uDCF6", "Cell Tower", "59,130,246") +
      body(
        row("Radio", esc(radio), radioColors[radio]) +
        row("MCC", String(d.mcc || "N/A")) +
        row("MNC", String(d.mnc || "N/A")) +
        row("Range", d.range ? `${d.range.toLocaleString()} m` : "N/A")
      )
    );
  },

  // ─── Population / News ───────────────────────────────────────────
  "population-gdelt-news": (d) => {
    const gs = d.goldsteinScale ?? 0;
    const { label, color } = goldsteinLabel(gs);
    const title = d.eventCode || d.actor1 || "News Event";
    return tooltip(
      header("\uD83D\uDCF0", title, "59,130,246") +
      body(
        row("Actor", esc(d.actor1 || "N/A")) +
        (d.actor2 ? row("Actor 2", esc(d.actor2)) : "") +
        row("Goldstein", `<span style="color:${color}">${gs.toFixed(1)} (${label})</span>`) +
        row("Mentions", String(d.numMentions || 0)) +
        row("Date", esc(d.dateAdded || "N/A"))
      )
    );
  },

  "population-wikipedia": (d) => {
    return tooltip(
      header("\uD83D\uDCD6", d.title || "Wikipedia", "59,130,246") +
      body(
        row("Description", esc(d.description || "N/A")) +
        (d.distance ? row("Distance", `${d.distance.toLocaleString()} m`) : "")
      )
    );
  },

  "population-conflicts": (d) => {
    const typeColors: Record<string, string> = {
      Battles: "#ef4444",
      "Violence against civilians": "#dc2626",
      "Explosions/Remote violence": "#f97316",
      Riots: "#facc15",
      Protests: "#3b82f6",
    };
    const evType = d.eventType || "Unknown";
    const color = typeColors[evType] || "#94a3b8";
    return tooltip(
      header("\u2694\uFE0F", "Armed Conflict", "239,68,68") +
      body(
        row("Type", esc(evType), color) +
        row("Country", esc(d.country || "N/A")) +
        row("Date", esc(d.eventDate || "N/A")) +
        row("Fatalities", String(d.fatalities ?? 0), d.fatalities > 0 ? "#ef4444" : undefined) +
        row("Actor", esc(d.actor1 || "N/A")) +
        (d.notes ? row("Notes", esc(d.notes.substring(0, 80) + (d.notes.length > 80 ? "..." : ""))) : "")
      )
    );
  },

  // ─── Economic ────────────────────────────────────────────────────
  "economic-world-bank": (d) => {
    return tooltip(
      header("\uD83C\uDF10", d.countryName || "Country", "59,130,246") +
      body(
        row("GDP", d.gdp != null ? `$${fmtNum(d.gdp)}` : "N/A") +
        row("GDP/capita", d.gdpPerCapita != null ? `$${fmtNum(d.gdpPerCapita)}` : "N/A") +
        row("Population", d.population != null ? fmtNum(d.population) : "N/A") +
        row("Year", String(d.year || "N/A"))
      )
    );
  },

  "economic-bitcoin-nodes": (d) => {
    return tooltip(
      header("\u20BF", `Bitcoin Nodes: ${d.city || "Unknown"}`, "249,163,22") +
      body(
        row("Nodes", String(d.nodeCount || 0)) +
        row("City", esc(d.city || "N/A")) +
        row("Country", esc(d.country || "N/A")) +
        row("ISP", esc(d.isp || "N/A"))
      )
    );
  },

  "economic-trade-flows": (d) => {
    return tooltip(
      header("\uD83D\uDCE6", "Trade Flow", "0,212,255") +
      body(
        row("From", esc(d.reporterCountry || "N/A")) +
        row("To", esc(d.partnerCountry || "N/A")) +
        row("Value", d.tradeValue != null ? `$${fmtNum(d.tradeValue)}` : "N/A") +
        row("Commodity", esc(d.commodity || "N/A")) +
        row("Year", String(d.year || "N/A"))
      )
    );
  },

  // ─── OSINT ───────────────────────────────────────────────────────
  "osint-border-wait": (d) => {
    const wt = d.waitTime ?? 0;
    const wtColor = wt < 15 ? "#4ade80" : wt < 45 ? "#facc15" : wt < 90 ? "#f97316" : "#ef4444";
    return tooltip(
      header("\uD83D\uDEC3", d.name || "Border Crossing", "59,130,246") +
      body(
        row("Wait time", `<strong style="color:${wtColor}">${wt} min</strong>`) +
        row("Type", esc(d.crossingType || "N/A")) +
        row("Lanes open", String(d.maxLanes || "N/A")) +
        row("Status", esc(d.operationalStatus || "N/A"))
      )
    );
  },

  "osint-radiation": (d) => {
    const val = d.value ?? 0;
    const { label, color } = radiationLabel(val);
    return tooltip(
      header("\u2622\uFE0F", d.name || "Radiation Sensor", "16,185,129") +
      body(
        row("Level", `<strong style="color:${color}">${val.toFixed(3)} \u03BCSv/h</strong>`) +
        row("Status", `<span style="color:${color}">${label}</span>`) +
        row("Last update", esc(d.lastUpdate || "N/A"))
      )
    );
  },

  "osint-sanctions": (d) => {
    return tooltip(
      header("\uD83D\uDEAB", d.countryName || "Sanctioned Country", "239,68,68") +
      body(
        row("Sanctions", String(d.sanctionCount || 0)) +
        row("Programs", esc((d.programs || []).join(", ") || "N/A"))
      )
    );
  },

  "osint-gps-jamming": (d) => {
    const lvl = d.level ?? 0;
    const pct = (lvl * 100).toFixed(0);
    const color = lvl > 0.7 ? "#ef4444" : lvl > 0.4 ? "#f97316" : "#facc15";
    return tooltip(
      header("\uD83D\uDCE1", "GPS Interference", "239,68,68") +
      body(
        row("Severity", `<span style="color:${color}">${pct}%</span>`) +
        row("Region", esc(d.region || "N/A")) +
        row("Date", esc(d.date || "N/A")) +
        row("Source", esc(d.source || "N/A"))
      )
    );
  },

  // ─── Cameras ─────────────────────────────────────────────────────
  "cameras-webcams": (d) => {
    const statusColor = d.status === "active" ? "#4ade80" : "#94a3b8";
    const thumb = d.thumbnail || "";
    const thumbHtml = thumb
      ? `<div style="padding:4px 10px 0"><img src="${esc(thumb)}" alt="" style="width:100%;border-radius:4px;max-height:140px;object-fit:cover" onerror="this.style.display='none'"/></div>`
      : "";
    return tooltip(
      header("\uD83D\uDCF7", d.title || "Webcam", "59,130,246") +
      thumbHtml +
      body(
        row("Status", esc(d.status || "N/A"), statusColor) +
        row("Country", esc(d.country || "N/A")) +
        `<tr><td colspan="2" style="color:#60a5fa;padding-top:4px;font-size:11px">\u25B6 Click to view live</td></tr>`
      )
    );
  },

  "cameras-cctv": (d) => {
    const statusColor = d.status === "online" ? "#4ade80" : "#ef4444";
    const clickHint = d.url ? `<tr><td colspan="2" style="color:#60a5fa;padding-top:4px;font-size:11px">\u25B6 Click to view image</td></tr>` : "";
    return tooltip(
      header("\uD83D\uDCF9", d.name || "CCTV Camera", "16,185,129") +
      body(
        row("Status", esc(d.status || "N/A"), statusColor) +
        row("Source", esc(d.source || "N/A")) +
        clickHint
      )
    );
  },

  // ─── Space Weather ───────────────────────────────────────────────
  "space-weather-aurora": (d) => {
    const prob = d.probability ?? 0;
    const probColor = prob >= 70 ? "#4ade80" : prob >= 30 ? "#facc15" : "#94a3b8";
    return tooltip(
      header("\u2728", "Aurora Forecast", "0,255,150") +
      body(
        row("Probability", `<strong style="color:${probColor}">${prob.toFixed(0)}%</strong>`) +
        row("Lat", d.latitude?.toFixed(1) || "N/A") +
        row("Lon", d.longitude?.toFixed(1) || "N/A")
      )
    );
  },

  // ─── Signals Intelligence ────────────────────────────────────────
  "signals-kiwisdr": (d) => {
    const statusColor = d.isOnline ? "#4ade80" : "#ef4444";
    const conflictColor = d.isInConflictZone ? "#ef4444" : "#4ade80";
    const utilColor = (d.utilization ?? 0) > 75 ? "#f97316" : (d.utilization ?? 0) > 40 ? "#facc15" : "#4ade80";
    return tooltip(
      header("\uD83D\uDCE1", d.name || "KiwiSDR Receiver", "96,165,250") +
      body(
        row("Status", d.isOnline ? "Online" : "Offline", statusColor) +
        row("Listeners", `${d.users ?? 0} / ${d.maxUsers ?? 4}`, utilColor) +
        row("Utilization", `${Math.round(d.utilization ?? 0)}%`, utilColor) +
        row("TDOA", d.tdoaEnabled ? "Capable" : "No", d.tdoaEnabled ? "#4ade80" : undefined) +
        row("Conflict zone", d.isInConflictZone ? d.conflictRegion || "Yes" : "No", conflictColor) +
        row("Country", esc(d.country || "N/A")) +
        (d.loc ? row("Location", esc(d.loc)) : "")
      )
    );
  },

  // ─── Historical ──────────────────────────────────────────────────
  "historical-timeline": (d) => {
    const typeColors: Record<string, string> = {
      earthquake: "#ef4444", conflict: "#f97316", wildfire: "#eab308", news: "#3b82f6",
    };
    const t = d.type || "unknown";
    const color = typeColors[t] || "#94a3b8";
    const dateStr = d.timestamp ? new Date(d.timestamp).toLocaleDateString() : "N/A";
    return tooltip(
      header("\uD83D\uDD70\uFE0F", d.title || "Timeline Event", "148,163,184") +
      body(
        row("Type", esc(t.charAt(0).toUpperCase() + t.slice(1)), color) +
        row("Date", dateStr) +
        (d.magnitude ? row("Magnitude", d.magnitude.toFixed(1)) : "") +
        row("Description", esc((d.description || "").substring(0, 100) + (d.description?.length > 100 ? "..." : "")))
      )
    );
  },
};


// ── Public API ───────────────────────────────────────────────────────

/**
 * Generate a rich HTML tooltip for a deck.gl pick event.
 *
 * @param layerId  - The deck.gl layer ID (from `info.layer.id`)
 * @param object   - The picked data object (already unwrapped from `_orig`)
 * @returns        - `{ html, style }` for deck.gl's getTooltip, or `null`
 */
export function getLayerTooltip(
  layerId: string,
  object: any
): { html: string; style: Record<string, string> } | null {
  if (!object) return null;

  const formatter = formatters[layerId];
  if (formatter) {
    try {
      return formatter(object);
    } catch {
      // Fall through to generic tooltip on formatter error
    }
  }

  // ── Generic fallback for any unknown pickable layer ──
  const name = object.name || object.title || object.id || object.callsign || object.flight || "Unknown";
  return tooltip(
    header("\uD83D\uDCCD", esc(name), "148,163,184") +
    body(row("Layer", esc(layerId)))
  );
}
