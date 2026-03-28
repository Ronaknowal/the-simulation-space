/**
 * IndexedDB persistence for recording sessions.
 * Two object stores:
 *   "recording-meta"      — one RecordingMeta per recording (keyed by id)
 *   "recording-snapshots" — many RecordedSnapshot rows per recording
 *                           (indexed by recordingId for bulk load/delete)
 */

import type { RecordingMeta, RecordedSnapshot } from "@/types/recording";

const DB_NAME = "vyom-recordings";
const DB_VERSION = 1;
const META_STORE = "recording-meta";
const SNAP_STORE = "recording-snapshots";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SNAP_STORE)) {
        const store = db.createObjectStore(SNAP_STORE, { autoIncrement: true });
        store.createIndex("recordingId", "recordingId", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Save a completed recording (metadata + all snapshots) atomically. */
export async function saveRecording(
  meta: RecordingMeta,
  snapshots: RecordedSnapshot[]
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([META_STORE, SNAP_STORE], "readwrite");
    tx.objectStore(META_STORE).put(meta);
    const snapStore = tx.objectStore(SNAP_STORE);
    for (const snap of snapshots) {
      snapStore.add({ recordingId: meta.id, ...snap });
    }
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** List all recording metadata, newest first. */
export async function listRecordings(): Promise<RecordingMeta[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readonly");
    const req = tx.objectStore(META_STORE).getAll();
    req.onsuccess = () => {
      db.close();
      const all: RecordingMeta[] = req.result ?? [];
      resolve(all.sort((a, b) => b.startTime - a.startTime));
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/** Load all snapshots for a recording (for replay). */
export async function loadRecordingSnapshots(
  id: string
): Promise<RecordedSnapshot[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAP_STORE, "readonly");
    const index = tx.objectStore(SNAP_STORE).index("recordingId");
    const req = index.getAll(id);
    req.onsuccess = () => {
      db.close();
      // Strip the internal `recordingId` field before returning
      const rows = (req.result ?? []).map(
        ({ recordingId: _r, ...rest }: any) => rest as RecordedSnapshot
      );
      resolve(rows);
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/** Permanently delete a recording and all its snapshots. */
export async function deleteRecording(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([META_STORE, SNAP_STORE], "readwrite");

    tx.objectStore(META_STORE).delete(id);

    const snapStore = tx.objectStore(SNAP_STORE);
    const idx = snapStore.index("recordingId");
    const keyReq = idx.getAllKeys(id);
    keyReq.onsuccess = () => {
      for (const key of keyReq.result) snapStore.delete(key);
    };

    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Export a recording as a self-contained JSON blob (meta + snapshots). */
export async function exportRecording(
  meta: RecordingMeta,
  snapshots: RecordedSnapshot[]
): Promise<void> {
  const payload = JSON.stringify({ meta, snapshots }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vyom-recording-${meta.name.replace(/\s+/g, "-")}-${meta.id.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Import a previously exported recording JSON file. */
export async function importRecordingFile(
  file: File
): Promise<{ meta: RecordingMeta; snapshots: RecordedSnapshot[] }> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed.meta || !Array.isArray(parsed.snapshots)) {
    throw new Error("Invalid recording file format");
  }
  // Assign a fresh ID to avoid collisions
  const meta: RecordingMeta = {
    ...parsed.meta,
    id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${parsed.meta.name} (imported)`,
  };
  return { meta, snapshots: parsed.snapshots };
}
