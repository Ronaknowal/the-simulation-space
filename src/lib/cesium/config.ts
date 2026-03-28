import * as Cesium from "cesium";

export function initializeCesium() {
  // Set base URL for Cesium static assets (Workers, Assets, ThirdParty, Widgets)
  if (typeof window !== "undefined") {
    (window as any).CESIUM_BASE_URL = "/cesium";
  }

  // Use Cesium Ion token if available (optional - many features work without it)
  const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
  if (ionToken) {
    Cesium.Ion.defaultAccessToken = ionToken;
  }
}

export const DEFAULT_CAMERA_POSITION = {
  destination: Cesium.Cartesian3.fromDegrees(0, 20, 20_000_000),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-90),
    roll: 0,
  },
};

export const GLOBE_OPTIONS: Cesium.Viewer.ConstructorOptions = {
  animation: false,
  baseLayerPicker: false,
  fullscreenButton: false,
  geocoder: false,
  homeButton: false,
  infoBox: false,
  sceneModePicker: false,
  selectionIndicator: false,
  timeline: false,
  navigationHelpButton: false,
  creditContainer: undefined,
  scene3DOnly: true,
  shadows: false,
  requestRenderMode: false,
  maximumRenderTimeChange: Infinity,
};
