export interface EarthquakeFeature {
  id: string;
  longitude: number;
  latitude: number;
  depth: number;
  magnitude: number;
  place: string;
  time: number;
  url: string;
  tsunami: boolean;
  alert: string | null;
  felt: number | null;
}

const USGS_ALL_DAY =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
const USGS_SIGNIFICANT =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson";

export async function fetchEarthquakes(
  minMagnitude = 0
): Promise<EarthquakeFeature[]> {
  const res = await fetch(USGS_ALL_DAY);
  if (!res.ok) throw new Error(`USGS API error: ${res.status}`);

  const data = await res.json();

  return data.features
    .filter(
      (f: any) =>
        f.properties.mag !== null && f.properties.mag >= minMagnitude
    )
    .map((f: any) => ({
      id: f.id,
      longitude: f.geometry.coordinates[0],
      latitude: f.geometry.coordinates[1],
      depth: f.geometry.coordinates[2],
      magnitude: f.properties.mag,
      place: f.properties.place || "Unknown",
      time: f.properties.time,
      url: f.properties.url,
      tsunami: f.properties.tsunami === 1,
      alert: f.properties.alert,
      felt: f.properties.felt,
    }));
}

export async function fetchSignificantEarthquakes(): Promise<
  EarthquakeFeature[]
> {
  const res = await fetch(USGS_SIGNIFICANT);
  if (!res.ok) throw new Error(`USGS API error: ${res.status}`);

  const data = await res.json();

  return data.features.map((f: any) => ({
    id: f.id,
    longitude: f.geometry.coordinates[0],
    latitude: f.geometry.coordinates[1],
    depth: f.geometry.coordinates[2],
    magnitude: f.properties.mag,
    place: f.properties.place || "Unknown",
    time: f.properties.time,
    url: f.properties.url,
    tsunami: f.properties.tsunami === 1,
    alert: f.properties.alert,
    felt: f.properties.felt,
  }));
}
