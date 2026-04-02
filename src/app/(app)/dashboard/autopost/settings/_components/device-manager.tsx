"use client";

import { useState, useCallback } from "react";

interface Device {
  id: string;
  deviceName: string;
  deviceType: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export function DeviceManager({ devices: initialDevices }: { devices: Device[] }) {
  const [devices, setDevices] = useState(initialDevices);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generatePairingCode = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/device-pairing", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate code");
      const data = await res.json();
      setPairingCode(data.code);
      setTimeout(() => setPairingCode(null), 5 * 60 * 1000); // Expire after 5 min
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const revokeDevice = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/auth/device-token/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke");
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      padding: "20px",
    }}>
      <h3 style={{ color: "var(--text-primary)", fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>
        Connected Devices
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "16px" }}>
        Manage desktop agents connected to your account.
      </p>

      {devices.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "16px" }}>
          No devices connected.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          {devices.map((device) => (
            <div
              key={device.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                background: "var(--bg-secondary)",
                borderRadius: "6px",
              }}
            >
              <div>
                <span style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: 500 }}>
                  {device.deviceName}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: "12px", marginLeft: "8px" }}>
                  {device.deviceType === "desktop_agent" ? "Desktop Agent" : "Browser"}
                </span>
              </div>
              <button
                onClick={() => revokeDevice(device.id)}
                style={{
                  background: "transparent",
                  color: "#ef4444",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "4px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      {pairingCode ? (
        <div style={{
          padding: "16px",
          background: "var(--bg-secondary)",
          borderRadius: "6px",
          textAlign: "center",
        }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginBottom: "8px" }}>
            Enter this code in the desktop agent:
          </p>
          <span style={{
            fontSize: "32px",
            fontWeight: 700,
            color: "var(--accent)",
            letterSpacing: "4px",
            fontFamily: "monospace",
          }}>
            {pairingCode}
          </span>
          <p style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "8px" }}>
            Expires in 5 minutes
          </p>
        </div>
      ) : (
        <button
          onClick={generatePairingCode}
          disabled={loading}
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? "Generating..." : "Add Desktop Agent"}
        </button>
      )}
    </div>
  );
}
