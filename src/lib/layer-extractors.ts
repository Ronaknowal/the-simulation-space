/**
 * Normalizes heterogeneous layer data into a flat array of geo-located items.
 * Handles the common data shapes used across all layers.
 */

import type { ExtractedItem } from "@/types/recording";

// ── Position extraction ──────────────────────────────────────────────────────

function extractPosition(
  item: any
): { longitude: number; latitude: number } | null {
  if (typeof item !== "object" || item === null) return null;

  // Most layers: direct longitude/latitude fields
  if (
    typeof item.longitude === "number" &&
    typeof item.latitude === "number"
  ) {
    return { longitude: item.longitude, latitude: item.latitude };
  }

  // Abbreviated lon/lat
  if (typeof item.lon === "number" && typeof item.lat === "number") {
    return { longitude: item.lon, latitude: item.lat };
  }

  // Position tuple [lon, lat, ...] (deck.gl convention)
  if (Array.isArray(item.position) && item.position.length >= 2) {
    const [lon, lat] = item.position;
    if (typeof lon === "number" && typeof lat === "number") {
      return { longitude: lon, latitude: lat };
    }
  }

  // GeoJSON Feature
  if (item.type === "Feature" && Array.isArray(item.geometry?.coordinates)) {
    const [lon, lat] = item.geometry.coordinates;
    if (typeof lon === "number" && typeof lat === "number") {
      return { longitude: lon, latitude: lat };
    }
  }

  return null;
}

function inferType(layerId: string, item: any): string {
  if (item.type && typeof item.type === "string" && item.type !== "Feature") {
    return item.type;
  }
  // Use the last segment of the layerId as the type label
  const parts = layerId.split(".");
  return parts[parts.length - 1] ?? layerId;
}

function extractLabel(item: any): string | undefined {
  return (
    item.title ??
    item.name ??
    item.place ??
    item.callsign ??
    item.icao ??
    item.mmsi ??
    item.id ??
    undefined
  );
}

function itemToExtracted(layerId: string, item: any): ExtractedItem | null {
  const pos = extractPosition(item);
  if (!pos) return null;

  // Build a compact payload — strip redundant position keys
  const {
    longitude: _ln, latitude: _lt,
    lon: _lo, lat: _la,
    position: _p,
    geometry: _g,
    ...rest
  } = item;

  return {
    ...pos,
    type: inferType(layerId, item),
    label: extractLabel(item) ?? "",
    payload: rest,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Extract all geo-located events from a layer's raw data.
 * Handles arrays, GeoJSON FeatureCollections, and single objects.
 * Returns an empty array if nothing extractable is found.
 */
export function extractLayerItems(
  layerId: string,
  data: any
): ExtractedItem[] {
  if (!data) return [];

  // GeoJSON FeatureCollection
  if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
    return extractFromArray(layerId, data.features);
  }

  // Plain array (most layers)
  if (Array.isArray(data)) {
    return extractFromArray(layerId, data);
  }

  // Single object
  const item = itemToExtracted(layerId, data);
  return item ? [item] : [];
}

function extractFromArray(layerId: string, items: any[]): ExtractedItem[] {
  const result: ExtractedItem[] = [];
  for (const item of items) {
    const extracted = itemToExtracted(layerId, item);
    if (extracted) result.push(extracted);
  }
  return result;
}
