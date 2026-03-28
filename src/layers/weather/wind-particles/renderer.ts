import { PathLayer } from "@deck.gl/layers";
import type { Position } from "@deck.gl/core";
import type { WindPoint } from "./fetcher";

/**
 * Wind speed to color mapping.
 * Calm = light blue, moderate = green/yellow, strong = orange/red
 */
function windSpeedToColor(speed: number): [number, number, number, number] {
  if (speed < 2) return [148, 163, 184, 100];   // Slate — calm
  if (speed < 5) return [34, 197, 94, 160];      // Green — light
  if (speed < 10) return [250, 204, 21, 180];    // Yellow — moderate
  if (speed < 15) return [249, 115, 22, 200];    // Orange — fresh
  if (speed < 25) return [239, 68, 68, 220];     // Red — strong
  return [168, 85, 247, 240];                     // Purple — storm
}

/**
 * Wind speed to arrow length in degrees.
 * Longer arrows = stronger winds. Scaled for 5° grid spacing.
 */
function windSpeedToLength(speed: number): number {
  // Arrow length: min 0.5° for calm, up to 3° for storms
  return Math.max(0.5, Math.min(speed * 0.2, 3.0));
}

/**
 * Arrow head size relative to arrow length.
 */
const ARROW_HEAD_RATIO = 0.3;
const ARROW_HEAD_ANGLE = 25 * (Math.PI / 180); // 25 degree spread

interface WindArrow {
  path: Position[];
  color: [number, number, number, number];
  width: number;
}

/**
 * Generates an arrow path for a single wind point.
 * The arrow points in the direction the wind is GOING TO
 * (meteorological direction → math direction conversion).
 *
 * Returns a path with:
 *  - shaft: center → tip
 *  - left barb
 *  - right barb
 */
function createWindArrow(point: WindPoint): WindArrow | null {
  const { longitude, latitude, windSpeed, windDirection } = point;
  if (windSpeed < 0.5) return null; // Skip calm winds

  const length = windSpeedToLength(windSpeed);

  // Meteorological direction: direction wind comes FROM (0=N, 90=E).
  // We want direction wind blows TO, so add 180°.
  const toAngleDeg = (windDirection + 180) % 360;
  const toAngleRad = (toAngleDeg * Math.PI) / 180;

  // Direction components in degrees (lon, lat)
  // sin → longitude (east-west), cos → latitude (north-south)
  const dx = Math.sin(toAngleRad) * length;
  const dy = Math.cos(toAngleRad) * length;

  // Half-length for centering the arrow on the grid point
  const halfDx = dx / 2;
  const halfDy = dy / 2;

  // Arrow shaft: from tail to tip, centered on grid point
  const tailLon = longitude - halfDx;
  const tailLat = latitude - halfDy;
  const tipLon = longitude + halfDx;
  const tipLat = latitude + halfDy;

  // Arrowhead barbs
  const headLen = length * ARROW_HEAD_RATIO;
  // Reverse direction for barbs (pointing backward from tip)
  const barbAngle1 = toAngleRad + Math.PI - ARROW_HEAD_ANGLE;
  const barbAngle2 = toAngleRad + Math.PI + ARROW_HEAD_ANGLE;

  const barb1Lon = tipLon + Math.sin(barbAngle1) * headLen;
  const barb1Lat = tipLat + Math.cos(barbAngle1) * headLen;
  const barb2Lon = tipLon + Math.sin(barbAngle2) * headLen;
  const barb2Lat = tipLat + Math.cos(barbAngle2) * headLen;

  const color = windSpeedToColor(windSpeed);

  // Width scales with wind speed: 1-3px
  const width = Math.max(1, Math.min(windSpeed / 8, 3));

  return {
    // Single connected path: barb1 → tip → barb2 (arrowhead), then back to tip → tail (shaft)
    path: [
      [tailLon, tailLat],
      [tipLon, tipLat],
      [barb1Lon, barb1Lat],
      [tipLon, tipLat],
      [barb2Lon, barb2Lat],
    ],
    color,
    width,
  };
}

/**
 * Creates a deck.gl PathLayer showing wind as directional arrows.
 *
 * Each grid point becomes an arrow:
 * - Direction shows where the wind is blowing TO
 * - Length proportional to wind speed
 * - Color indicates speed (green → yellow → orange → red → purple)
 * - Width increases slightly with speed
 */
export function createWindParticlesLayer(
  data: WindPoint[],
  opacity: number = 1,
  _filters: Record<string, any> = {}
) {
  const arrows = data
    .map(createWindArrow)
    .filter((a): a is WindArrow => a !== null);

  return new PathLayer<WindArrow>({
    id: "weather-wind-particles",
    data: arrows,
    pickable: false,
    opacity,
    getPath: (d) => d.path,
    getColor: (d) => d.color,
    getWidth: (d) => d.width,
    widthUnits: "pixels" as any,
    widthMinPixels: 1,
    widthMaxPixels: 4,
    capRounded: false,
    jointRounded: false,
    billboard: false,
    updateTriggers: {
      getColor: [],
      getWidth: [],
    },
  });
}
