export interface NearEarthObject {
  id: string;
  name: string;
  estimatedDiameter: number; // meters (average of min/max)
  isPotentiallyHazardous: boolean;
  closeApproachDate: string;
  missDistance: number; // km
  relativeVelocity: number; // km/s
  orbitingBody: string;
}

/**
 * Fetches today's near-Earth objects from NASA NEO API.
 * Uses DEMO_KEY which has rate limits but works without registration.
 */
export async function fetchNearEarthObjects(): Promise<NearEarthObject[]> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=DEMO_KEY`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NASA NEO API error: ${res.status}`);

  const data = await res.json();
  const dateKey = today;
  const objects = data.near_earth_objects?.[dateKey] ?? [];

  return objects.map((neo: any) => {
    const diamMin =
      neo.estimated_diameter?.meters?.estimated_diameter_min ?? 0;
    const diamMax =
      neo.estimated_diameter?.meters?.estimated_diameter_max ?? 0;

    const approach = neo.close_approach_data?.[0] ?? {};

    return {
      id: neo.id,
      name: neo.name,
      estimatedDiameter: Math.round((diamMin + diamMax) / 2),
      isPotentiallyHazardous:
        neo.is_potentially_hazardous_asteroid ?? false,
      closeApproachDate: approach.close_approach_date_full ?? today,
      missDistance: Math.round(
        parseFloat(approach.miss_distance?.kilometers ?? "0")
      ),
      relativeVelocity:
        Math.round(
          parseFloat(
            approach.relative_velocity?.kilometers_per_second ?? "0"
          ) * 100
        ) / 100,
      orbitingBody: approach.orbiting_body ?? "Earth",
    };
  });
}
