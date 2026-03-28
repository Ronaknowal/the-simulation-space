import { ScatterplotLayer, PathLayer } from "@deck.gl/layers";
import type { ISSPosition } from "./fetcher";

/**
 * Creates a deck.gl layer for the ISS position (bright pulsing dot)
 * and its projected orbit path.
 */
export function createISSLayer(
  data: ISSPosition,
  opacity: number = 1,
  _filters: Record<string, any> = {}
) {
  const issPoint = {
    position: [data.longitude, data.latitude, data.altitude * 1000] as [
      number,
      number,
      number,
    ],
    velocity: data.velocity,
    altitude: data.altitude,
  };

  const layers = [];

  // Orbit path (faint line showing future ground track)
  if (data.orbitPath && data.orbitPath.length > 1) {
    layers.push(
      new PathLayer({
        id: "satellites-iss-orbit",
        data: [{ path: data.orbitPath }],
        getPath: (d: any) => d.path,
        getColor: [100, 200, 255, 80],
        getWidth: 1,
        widthMinPixels: 1,
        widthMaxPixels: 2,
        opacity: opacity * 0.5,
        pickable: false,
      })
    );
  }

  // ISS marker (larger bright dot)
  layers.push(
    new ScatterplotLayer({
      id: "satellites-iss-position",
      data: [issPoint],
      pickable: true,
      opacity,
      filled: true,
      radiusMinPixels: 6,
      radiusMaxPixels: 14,
      getPosition: (d: any) => d.position,
      getRadius: 50000,
      getFillColor: [0, 200, 255, 255], // Bright cyan
      getLineColor: [255, 255, 255, 200],
      getLineWidth: 2,
      stroked: true,
      lineWidthMinPixels: 2,
    })
  );

  return layers;
}
