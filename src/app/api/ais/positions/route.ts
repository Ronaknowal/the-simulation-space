import { NextResponse } from "next/server";

/**
 * AIS Ship Positions REST endpoint.
 *
 * Strategy:
 * 1. Try AISStream.io WebSocket relay (15-second collection window)
 * 2. If WebSocket fails/times out, return curated fallback data
 *    covering major global shipping lanes
 *
 * GET /api/ais/positions
 * Response: { positions: ShipPosition[] }
 */

export const dynamic = "force-dynamic"; // Never cache — live data

export async function GET() {
  const apiKey = process.env.AISSTREAM_API_KEY;

  // Try AISStream WebSocket if API key is available
  if (apiKey) {
    try {
      const positions = await collectPositionsWithTimeout(apiKey, 6_000);
      if (positions.length > 0) {
        return NextResponse.json(
          { positions, source: "aisstream" },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown";
      console.warn("[AIS] WebSocket failed, using fallback:", msg);
    }
  }

  // Fallback: curated ship positions along major shipping lanes
  const fallback = generateShippingLaneData();
  return NextResponse.json(
    { positions: fallback, source: "fallback" },
    { headers: { "Cache-Control": "public, max-age=60" } }
  );
}

/**
 * WebSocket collection with a hard timeout.
 * If the WS doesn't connect in time, we reject immediately.
 */
async function collectPositionsWithTimeout(apiKey: string, timeoutMs: number) {
  const { WebSocket } = await import("ws");

  return new Promise<any[]>((resolve, reject) => {
    const positions = new Map<number, any>();
    let ws: InstanceType<typeof WebSocket>;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      try { ws?.close(); } catch { /* ignore */ }
      resolve(Array.from(positions.values()).slice(0, 500));
    };

    const fail = (msg: string) => {
      if (done) return;
      done = true;
      try { ws?.close(); } catch { /* ignore */ }
      reject(new Error(msg));
    };

    const timer = setTimeout(() => {
      if (positions.size > 0) finish();
      else fail("WebSocket timeout");
    }, timeoutMs);

    try {
      ws = new WebSocket("wss://stream.aisstream.io/v0/stream", {
        handshakeTimeout: 3_000,
      });
    } catch (err) {
      clearTimeout(timer);
      reject(new Error(`WS create failed: ${err}`));
      return;
    }

    ws.on("open", () => {
      ws.send(JSON.stringify({
        APIKey: apiKey,
        BoundingBoxes: [[[-90, -180], [90, 180]]],
        FilterMessageTypes: ["PositionReport"],
      }));
    });

    ws.on("message", (raw: Buffer | string) => {
      try {
        const msg = JSON.parse(raw.toString());
        const report = msg.Message?.PositionReport;
        const meta = msg.MetaData;
        if (!report) return;

        const lat = report.Latitude !== 0 ? report.Latitude : meta?.latitude ?? 0;
        const lon = report.Longitude !== 0 ? report.Longitude : meta?.longitude ?? 0;
        if (lat === 0 && lon === 0) return;
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return;

        const mmsi = meta?.MMSI || report.UserID || 0;
        if (mmsi === 0) return;

        positions.set(mmsi, {
          mmsi,
          name: (meta?.ShipName || "").trim(),
          latitude: lat,
          longitude: lon,
          speed: (report.Sog ?? 0) / 10,
          course: (report.Cog ?? 0) / 10,
          heading: report.TrueHeading ?? 0,
          shipType: 0,
          destination: "",
          timestamp: meta?.time_utc ? new Date(meta.time_utc).getTime() : Date.now(),
        });

        if (positions.size >= 500) {
          clearTimeout(timer);
          finish();
        }
      } catch { /* skip malformed */ }
    });

    ws.on("error", (err: Error) => {
      clearTimeout(timer);
      fail(`WS error: ${err.message}`);
    });

    ws.on("close", () => {
      clearTimeout(timer);
      finish();
    });
  });
}

/**
 * Generates realistic ship positions along major global shipping lanes.
 * Positions are scattered along the world's busiest maritime routes.
 */
function generateShippingLaneData() {
  const lanes: Array<{
    name: string;
    waypoints: [number, number][]; // [lat, lon] pairs
    shipCount: number;
    types: number[]; // AIS ship type codes
  }> = [
    // Strait of Malacca (Singapore → Indian Ocean)
    {
      name: "Strait of Malacca",
      waypoints: [[1.2, 103.8], [2.5, 101.5], [4.0, 99.5], [5.5, 97.0]],
      shipCount: 40,
      types: [70, 71, 80, 81, 60],
    },
    // Suez Canal approach
    {
      name: "Suez Canal",
      waypoints: [[30.0, 32.5], [31.0, 32.3], [29.0, 33.0], [27.0, 34.5]],
      shipCount: 25,
      types: [70, 80, 81, 71],
    },
    // English Channel
    {
      name: "English Channel",
      waypoints: [[50.8, -1.0], [50.5, 0.5], [51.0, 1.5], [51.5, 2.5]],
      shipCount: 30,
      types: [70, 80, 60, 31],
    },
    // South China Sea
    {
      name: "South China Sea",
      waypoints: [[10.0, 110.0], [14.0, 114.0], [18.0, 117.0], [22.0, 119.0]],
      shipCount: 35,
      types: [70, 71, 72, 80],
    },
    // Panama Canal approach
    {
      name: "Panama Canal",
      waypoints: [[9.0, -79.5], [9.3, -79.9], [8.8, -79.0], [8.5, -78.5]],
      shipCount: 15,
      types: [70, 80, 71],
    },
    // Persian Gulf
    {
      name: "Persian Gulf",
      waypoints: [[26.0, 56.0], [25.5, 54.0], [26.5, 52.0], [27.5, 50.0]],
      shipCount: 25,
      types: [80, 81, 82, 70],
    },
    // US East Coast (NY → Norfolk)
    {
      name: "US East Coast",
      waypoints: [[40.5, -73.8], [39.0, -74.0], [37.0, -75.5], [36.8, -76.0]],
      shipCount: 20,
      types: [70, 80, 60, 31],
    },
    // US West Coast (LA → Seattle)
    {
      name: "US West Coast",
      waypoints: [[33.7, -118.3], [37.5, -122.5], [42.0, -124.5], [47.5, -122.5]],
      shipCount: 20,
      types: [70, 80, 60],
    },
    // Mediterranean
    {
      name: "Mediterranean",
      waypoints: [[36.0, -5.5], [37.0, 0.0], [38.0, 5.0], [39.0, 10.0], [35.5, 15.0]],
      shipCount: 30,
      types: [70, 80, 60, 37],
    },
    // North Atlantic (EU → US)
    {
      name: "North Atlantic",
      waypoints: [[50.0, -5.0], [49.0, -20.0], [45.0, -40.0], [42.0, -55.0], [40.5, -70.0]],
      shipCount: 20,
      types: [70, 71, 80],
    },
    // Indian Ocean (Aden → Mumbai)
    {
      name: "Indian Ocean",
      waypoints: [[12.0, 45.0], [14.0, 52.0], [16.0, 60.0], [18.5, 68.0], [19.0, 72.5]],
      shipCount: 20,
      types: [80, 81, 70],
    },
    // East China Sea / Yellow Sea
    {
      name: "East China Sea",
      waypoints: [[31.2, 121.5], [33.0, 125.0], [35.0, 126.5], [37.5, 126.0]],
      shipCount: 25,
      types: [70, 71, 30, 80],
    },
    // Bab el-Mandeb / Red Sea
    {
      name: "Red Sea",
      waypoints: [[12.5, 43.3], [15.0, 42.0], [20.0, 38.5], [25.0, 35.5]],
      shipCount: 15,
      types: [80, 70, 71],
    },
    // Cape of Good Hope
    {
      name: "Cape of Good Hope",
      waypoints: [[-34.5, 18.5], [-34.0, 20.0], [-33.0, 25.0], [-30.0, 31.0]],
      shipCount: 12,
      types: [80, 81, 70],
    },
    // Japan Straits
    {
      name: "Japan Straits",
      waypoints: [[33.5, 129.5], [34.5, 132.0], [35.0, 135.0], [34.5, 137.0]],
      shipCount: 20,
      types: [70, 80, 30, 60],
    },
  ];

  const positions: any[] = [];
  let mmsiCounter = 200000000;

  const shipNames = [
    "EVER GIVEN", "MSC OSCAR", "MAERSK EINDHOVEN", "CMA CGM MARCO POLO",
    "COSCO SHIPPING UNIVERSE", "OOCL HONG KONG", "MSC GULSUN", "HMM ALGECIRAS",
    "YANG MING WITNESS", "HAPAG LLOYD HAMBURG", "MOL TRIUMPH", "ONE APUS",
    "ZIM ANTWERP", "PIL KAINAN", "PACIFIC BASIN", "ATLANTIC STAR",
    "NORDIC ORION", "GLOBAL MERCY", "STENA BULK", "FRONTLINE PIONEER",
  ];

  for (const lane of lanes) {
    for (let i = 0; i < lane.shipCount; i++) {
      // Pick a random segment along the lane
      const segIdx = Math.floor(Math.random() * (lane.waypoints.length - 1));
      const t = Math.random();
      const wp1 = lane.waypoints[segIdx];
      const wp2 = lane.waypoints[segIdx + 1];

      const lat = wp1[0] + (wp2[0] - wp1[0]) * t + (Math.random() - 0.5) * 0.5;
      const lon = wp1[1] + (wp2[1] - wp1[1]) * t + (Math.random() - 0.5) * 0.5;

      const shipType = lane.types[Math.floor(Math.random() * lane.types.length)];
      const speed = 5 + Math.random() * 15;
      const course = Math.random() * 360;

      positions.push({
        mmsi: mmsiCounter++,
        name: shipNames[Math.floor(Math.random() * shipNames.length)] || "",
        latitude: lat,
        longitude: lon,
        speed: Math.round(speed * 10) / 10,
        course: Math.round(course * 10) / 10,
        heading: Math.round(course),
        shipType,
        destination: lane.name,
        timestamp: Date.now(),
      });
    }
  }

  return positions;
}
