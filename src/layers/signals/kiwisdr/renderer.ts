import { ScatterplotLayer } from "@deck.gl/layers";
import type { KiwisdrData, KiwisdrReceiver } from "./fetcher";

/**
 * KiwiSDR receivers rendered as glowing cyan dots on the globe.
 * Dot size scales with listener count; color indicates region of interest.
 */
export function createKiwisdrLayer(
  data: KiwisdrData,
  opacity: number = 1,
  _filters: Record<string, any> = {}
) {
  const receivers = data?.onlineReceivers ?? [];
  if (!receivers.length) return null;

  // Track receivers in conflict zones for color coding
  const conflictZoneSet = new Set<string>();
  for (const zone of Object.values(data.conflictZones ?? {})) {
    for (const rx of zone.receivers) {
      conflictZoneSet.add(rx.name + rx.location);
    }
  }

  return new ScatterplotLayer<KiwisdrReceiver>({
    id: "signals-kiwisdr",
    data: receivers,
    pickable: true,
    opacity,
    stroked: true,
    filled: true,
    radiusMinPixels: 2,
    radiusMaxPixels: 10,
    lineWidthMinPixels: 1,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: (d) => 30_000 + (d.users > 0 ? Math.min(d.users * 10_000, 100_000) : 0),
    getFillColor: (d) => {
      const inConflict = conflictZoneSet.has(d.name + d.location);
      if (inConflict) return [255, 95, 99, 220];          // Red: conflict zone
      if (d.users > 3) return [255, 184, 76, 220];        // Orange: busy
      if (d.tdoa) return [68, 204, 255, 200];             // Cyan: TDOA capable
      return [100, 240, 200, 160];                        // Green: normal
    },
    getLineColor: (d) => {
      const inConflict = conflictZoneSet.has(d.name + d.location);
      if (inConflict) return [255, 95, 99, 100];
      return [100, 240, 200, 60];
    },
    getLineWidth: 1,
    updateTriggers: { getFillColor: [data?.network?.totalUsers], getRadius: [data?.network?.totalUsers] },
  });
}
