/**
 * File System Access API sync worker.
 *
 * Runs in the browser as a polling loop (every 30s).
 * Reads the creator's designated local folder, detects new files,
 * and uploads them to the content buffer via presigned R2 URLs.
 *
 * Note: This runs on the main thread (not a Web Worker) because
 * the File System Access API handles require the original directory handle.
 */

// File System Access API type augmentations (not in standard TS lib)
declare global {
  interface FileSystemDirectoryHandle {
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
    queryPermission(descriptor?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
    requestPermission(descriptor?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
  }
  interface Window {
    showDirectoryPicker(options?: { mode?: "read" | "readwrite" }): Promise<FileSystemDirectoryHandle>;
  }
}

interface SyncedFile {
  path: string;
  contentType: string;
  syncedAt: number;
}

interface SyncState {
  igAccountId: string;
  syncedFiles: Map<string, SyncedFile>;
  directoryHandle: FileSystemDirectoryHandle | null;
  isRunning: boolean;
  intervalId: ReturnType<typeof setInterval> | null;
  onStatusChange?: (status: SyncStatus) => void;
}

export interface SyncStatus {
  isConnected: boolean;
  isRunning: boolean;
  lastSyncAt: number | null;
  filesPending: number;
  filesTotal: number;
  error: string | null;
}

const CONTENT_TYPE_FOLDERS: Record<string, string> = {
  reels: "REEL",
  "feed-video": "FEED_VIDEO",
  "feed-photo": "FEED_PHOTO",
  stories: "STORY_VIDEO", // Will detect image vs video
  carousels: "CAROUSEL",
};

const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const SUPPORTED_EXTENSIONS = new Set([...VIDEO_EXTENSIONS, ...IMAGE_EXTENSIONS]);

const SYNC_DB_NAME = "clipprofit-sync";
const SYNC_STORE_NAME = "synced-files";

// IndexedDB helpers for persisting sync state
async function openSyncDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SYNC_STORE_NAME)) {
        db.createObjectStore(SYNC_STORE_NAME, { keyPath: "path" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadSyncedFiles(igAccountId: string): Promise<Map<string, SyncedFile>> {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_STORE_NAME, "readonly");
    const store = tx.objectStore(SYNC_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const files = new Map<string, SyncedFile>();
      for (const item of request.result) {
        if (item.igAccountId === igAccountId) {
          files.set(item.path, item);
        }
      }
      resolve(files);
    };
    request.onerror = () => reject(request.error);
  });
}

async function markFileSynced(igAccountId: string, path: string, contentType: string): Promise<void> {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_STORE_NAME, "readwrite");
    const store = tx.objectStore(SYNC_STORE_NAME);
    store.put({ path, igAccountId, contentType, syncedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function readDirectoryFiles(
  dirHandle: FileSystemDirectoryHandle,
  basePath = "",
): Promise<Array<{ handle: FileSystemFileHandle; path: string; folder: string }>> {
  const files: Array<{ handle: FileSystemFileHandle; path: string; folder: string }> = [];

  for await (const [name, handle] of dirHandle.entries()) {
    const fullPath = basePath ? `${basePath}/${name}` : name;

    if (handle.kind === "directory") {
      // Only recurse into known content type folders (and carousel set subfolders)
      const subFiles = await readDirectoryFiles(handle as FileSystemDirectoryHandle, fullPath);
      files.push(...subFiles);
    } else if (handle.kind === "file") {
      const ext = name.split(".").pop()?.toLowerCase() || "";
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        // Determine the content type folder from the path
        const topFolder = basePath.split("/")[0];
        files.push({ handle: handle as FileSystemFileHandle, path: fullPath, folder: topFolder });
      }
    }
  }

  return files;
}

function determineContentType(folder: string, fileName: string): string | null {
  const mappedType = CONTENT_TYPE_FOLDERS[folder];
  if (!mappedType) return null;

  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  // For stories, detect if it's a video or photo
  if (folder === "stories") {
    return VIDEO_EXTENSIONS.has(ext) ? "STORY_VIDEO" : "STORY_PHOTO";
  }

  // For feed-photo, only accept images
  if (folder === "feed-photo" && !IMAGE_EXTENSIONS.has(ext)) return null;

  // For reels and feed-video, only accept videos
  if ((folder === "reels" || folder === "feed-video") && !VIDEO_EXTENSIONS.has(ext)) return null;

  return mappedType;
}

async function uploadFile(
  igAccountId: string,
  file: File,
  contentType: string,
  localPath: string,
): Promise<void> {
  // 1. Get presigned upload URL
  const urlRes = await fetch("/api/sync/file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      igAccountId,
      contentType,
      fileName: file.name,
      fileMimeType: file.type || "application/octet-stream",
      localPath,
      syncSource: "browser_fsa",
    }),
  });

  if (!urlRes.ok) throw new Error(`Failed to get upload URL: ${urlRes.statusText}`);
  const { uploadUrl, alreadySynced } = await urlRes.json();

  if (alreadySynced) return; // Already in buffer

  // 2. Upload to R2 via presigned URL
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });

  if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.statusText}`);
}

export function createSyncController(
  igAccountId: string,
  onStatusChange?: (status: SyncStatus) => void,
): {
  connect: () => Promise<boolean>;
  start: () => void;
  stop: () => void;
  getStatus: () => SyncStatus;
} {
  const state: SyncState = {
    igAccountId,
    syncedFiles: new Map(),
    directoryHandle: null,
    isRunning: false,
    intervalId: null,
    onStatusChange,
  };

  let lastSyncAt: number | null = null;
  let filesPending = 0;
  let filesTotal = 0;
  let error: string | null = null;

  function emitStatus() {
    onStatusChange?.({
      isConnected: !!state.directoryHandle,
      isRunning: state.isRunning,
      lastSyncAt,
      filesPending,
      filesTotal,
      error,
    });
  }

  async function syncOnce() {
    if (!state.directoryHandle) return;

    try {
      error = null;

      // Verify permission is still granted
      const permission = await state.directoryHandle.queryPermission({ mode: "read" });
      if (permission !== "granted") {
        const requested = await state.directoryHandle.requestPermission({ mode: "read" });
        if (requested !== "granted") {
          error = "Permission denied to read folder";
          emitStatus();
          return;
        }
      }

      // Load synced files from IndexedDB
      state.syncedFiles = await loadSyncedFiles(igAccountId);

      // Read all files from directory
      const allFiles = await readDirectoryFiles(state.directoryHandle);
      filesTotal = allFiles.length;

      // Filter to unsynced files
      const unsyncedFiles = allFiles.filter((f) => !state.syncedFiles.has(f.path));
      filesPending = unsyncedFiles.length;
      emitStatus();

      // Upload each unsynced file
      for (const fileEntry of unsyncedFiles) {
        const contentType = determineContentType(fileEntry.folder, fileEntry.handle.name);
        if (!contentType) continue;

        try {
          const file = await fileEntry.handle.getFile();
          await uploadFile(igAccountId, file, contentType, fileEntry.path);
          await markFileSynced(igAccountId, fileEntry.path, contentType);
          filesPending--;
          emitStatus();
        } catch (err) {
          console.error(`[FSA Sync] Failed to upload ${fileEntry.path}:`, err);
        }
      }

      lastSyncAt = Date.now();
      emitStatus();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error("[FSA Sync] Sync error:", err);
      emitStatus();
    }
  }

  return {
    async connect(): Promise<boolean> {
      try {
        if (!("showDirectoryPicker" in window)) {
          error = "File System Access API not supported in this browser";
          emitStatus();
          return false;
        }

        state.directoryHandle = await window.showDirectoryPicker({ mode: "read" });
        emitStatus();
        return true;
      } catch (err) {
        if ((err as Error).name === "AbortError") return false; // User cancelled
        error = err instanceof Error ? err.message : String(err);
        emitStatus();
        return false;
      }
    },

    start() {
      if (state.isRunning) return;
      state.isRunning = true;

      // Run immediately
      syncOnce();

      // Then every 30 seconds
      state.intervalId = setInterval(syncOnce, 30_000);
      emitStatus();
    },

    stop() {
      state.isRunning = false;
      if (state.intervalId) {
        clearInterval(state.intervalId);
        state.intervalId = null;
      }
      emitStatus();
    },

    getStatus(): SyncStatus {
      return {
        isConnected: !!state.directoryHandle,
        isRunning: state.isRunning,
        lastSyncAt,
        filesPending,
        filesTotal,
        error,
      };
    },
  };
}
