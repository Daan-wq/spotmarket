"use client";

interface OverlayPickerProps {
  position: string;
  size: string;
  onPositionChange: (position: string) => void;
  onSizeChange: (size: string) => void;
  defaultPosition?: string;
}

const positions = [
  { id: "top-left", label: "Top Left", x: 0.2, y: 0.2 },
  { id: "top-center", label: "Top Center", x: 0.5, y: 0.2 },
  { id: "top-right", label: "Top Right", x: 0.8, y: 0.2 },
  { id: "middle-left", label: "Middle Left", x: 0.2, y: 0.5 },
  { id: "middle-center", label: "Center", x: 0.5, y: 0.5 },
  { id: "middle-right", label: "Middle Right", x: 0.8, y: 0.5 },
  { id: "bottom-left", label: "Bottom Left", x: 0.2, y: 0.8 },
  { id: "bottom-center", label: "Bottom Center", x: 0.5, y: 0.8 },
  { id: "bottom-right", label: "Bottom Right", x: 0.8, y: 0.8 },
];

const sizes = [
  { id: "small", label: "S" },
  { id: "medium", label: "M" },
  { id: "large", label: "L" },
];

export function OverlayPicker({
  position,
  size,
  onPositionChange,
  onSizeChange,
}: OverlayPickerProps) {
  return (
    <div className="mb-6 space-y-6">
      <div>
        <label className="text-xs font-semibold block mb-3" style={{ color: "var(--text-secondary)" }}>
          Overlay Position
        </label>
        <div className="grid grid-cols-3 gap-2">
          {positions.map((pos) => (
            <button
              key={pos.id}
              onClick={() => onPositionChange(pos.id)}
              className="relative w-full rounded border transition-colors"
              style={{
                aspectRatio: "9/16",
                background: "var(--bg-elevated)",
                borderColor: position === pos.id ? "var(--accent)" : "var(--border)",
                backgroundColor: position === pos.id ? "var(--accent-bg)" : "var(--bg-elevated)",
              }}
              title={pos.label}
            >
              <div
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: "var(--accent)",
                  left: `${pos.x * 100}%`,
                  top: `${pos.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold block mb-3" style={{ color: "var(--text-secondary)" }}>
          Overlay Size
        </label>
        <div className="flex gap-2">
          {sizes.map((s) => (
            <button
              key={s.id}
              onClick={() => onSizeChange(s.id)}
              className="flex-1 py-2 px-3 rounded border text-xs font-medium transition-colors"
              style={{
                borderColor: size === s.id ? "var(--accent)" : "var(--border)",
                background: size === s.id ? "var(--accent)" : "var(--bg-elevated)",
                color: size === s.id ? "#fff" : "var(--text-primary)",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
