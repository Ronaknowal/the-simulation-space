export interface ExtractedItem {
  longitude: number;
  latitude: number;
  type: string;
  label: string;
  payload: Record<string, unknown>;
}

export interface RecordedSnapshot {
  layerId: string;
  timestamp: number;
  items: ExtractedItem[];
}

export interface RecordingMeta {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  snapshotCount: number;
  layerIds: string[];
}
