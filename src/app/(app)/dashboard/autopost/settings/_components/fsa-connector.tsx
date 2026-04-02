"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createSyncController, type SyncStatus } from "@/lib/fsa-sync-worker";

interface IgAccount {
  id: string;
  platformUsername: string;
}

export function FsaConnector({ igAccounts }: { igAccounts: IgAccount[] }) {
  const [selectedAccount, setSelectedAccount] = useState(igAccounts[0]?.id || "");
  const [status, setStatus] = useState<SyncStatus>({
    isConnected: false,
    isRunning: false,
    lastSyncAt: null,
    filesPending: 0,
    filesTotal: 0,
    error: null,
  });

  const controllerRef = useRef<ReturnType<typeof createSyncController> | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.stop();
    };
  }, []);

  const handleConnect = useCallback(async () => {
    if (!selectedAccount) return;

    controllerRef.current?.stop();

    const controller = createSyncController(selectedAccount, setStatus);
    controllerRef.current = controller;

    const connected = await controller.connect();
    if (connected) {
      controller.start();
    }
  }, [selectedAccount]);

  const handleDisconnect = useCallback(() => {
    controllerRef.current?.stop();
    controllerRef.current = null;
    setStatus({
      isConnected: false,
      isRunning: false,
      lastSyncAt: null,
      filesPending: 0,
      filesTotal: 0,
      error: null,
    });
  }, []);

  const isSupported = typeof window !== "undefined" && "showDirectoryPicker" in window;

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      padding: "20px",
    }}>
      <h3 style={{ color: "var(--text-primary)", fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>
        Local Folder Sync
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "16px" }}>
        Connect a local folder to automatically sync content to your buffer.
      </p>

      {!isSupported && (
        <div style={{
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "6px",
          padding: "12px",
          marginBottom: "16px",
          color: "#ef4444",
          fontSize: "13px",
        }}>
          File System Access API is not supported in this browser. Use Chrome or Edge.
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          style={{
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "8px 12px",
            fontSize: "13px",
          }}
        >
          {igAccounts.map((acc) => (
            <option key={acc.id} value={acc.id}>@{acc.platformUsername}</option>
          ))}
        </select>

        {!status.isConnected ? (
          <button
            onClick={handleConnect}
            disabled={!isSupported || !selectedAccount}
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              opacity: !isSupported || !selectedAccount ? 0.5 : 1,
            }}
          >
            Connect Folder
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "8px 16px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Disconnect
          </button>
        )}
      </div>

      {status.isConnected && (
        <div style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
          fontSize: "13px",
        }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: status.isRunning ? "#22c55e" : "var(--text-secondary)",
          }}>
            <span style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: status.isRunning ? "#22c55e" : "var(--text-muted)",
              display: "inline-block",
            }} />
            {status.isRunning ? "Syncing" : "Paused"}
          </span>
          <span style={{ color: "var(--text-secondary)" }}>
            {status.filesTotal} files found
          </span>
          {status.filesPending > 0 && (
            <span style={{ color: "var(--accent)" }}>
              {status.filesPending} pending upload
            </span>
          )}
          {status.lastSyncAt && (
            <span style={{ color: "var(--text-muted)" }}>
              Last sync: {new Date(status.lastSyncAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {status.error && (
        <div style={{
          marginTop: "12px",
          color: "#ef4444",
          fontSize: "13px",
        }}>
          {status.error}
        </div>
      )}

      <div style={{
        marginTop: "16px",
        padding: "12px",
        background: "var(--bg-secondary)",
        borderRadius: "6px",
        fontSize: "12px",
        color: "var(--text-muted)",
      }}>
        <strong>Folder structure:</strong>
        <pre style={{ marginTop: "8px", whiteSpace: "pre-wrap" }}>
{`ClipProfit Sync/
  reels/
    video_001.mp4
  feed-video/
    video_001.mp4
  feed-photo/
    photo_001.jpg
  stories/
    story_001.mp4
  carousels/
    set-001/
      slide_01.jpg
      slide_02.jpg`}
        </pre>
      </div>
    </div>
  );
}
