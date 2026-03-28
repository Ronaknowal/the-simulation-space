export interface TectonicPlateFeature {
  type: "Feature";
  geometry: {
    type: "MultiLineString" | "LineString";
    coordinates: number[][][] | number[][];
  };
  properties: {
    Name: string;
    Source: string;
    PlateA?: string;
    PlateB?: string;
  };
}

const PLATES_URL =
  "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json";

export async function fetchTectonicPlates(): Promise<any> {
  const res = await fetch(PLATES_URL);
  if (!res.ok) throw new Error(`Tectonic plates fetch failed: ${res.status}`);
  return res.json();
}
