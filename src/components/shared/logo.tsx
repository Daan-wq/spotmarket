interface LogoProps {
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { fontSize: "18px", swooshHeight: "6px", swooshMargin: "-1px", strokeWidth: 3 },
  md: { fontSize: "28px", swooshHeight: "10px", swooshMargin: "-2px", strokeWidth: 2.8 },
  lg: { fontSize: "64px", swooshHeight: "20px", swooshMargin: "-6px", strokeWidth: 2.5 },
};

export function Logo({ variant = "dark", size = "sm" }: LogoProps) {
  const s = SIZES[size];
  const profitColor = variant === "dark" ? "#FFFFFF" : "#1A1A2E";

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
      <span style={{ fontSize: s.fontSize, lineHeight: 1, whiteSpace: "nowrap", letterSpacing: "-0.02em", fontFamily: "var(--font-sans), 'Lexend', sans-serif" }}>
        <span style={{ fontWeight: 700, color: "#6366F1" }}>€</span>
        <span style={{ fontWeight: 600, color: "#6366F1" }}>lip</span>
        <span style={{ fontWeight: 600, color: profitColor }}>Profit</span>
      </span>
      <svg
        style={{ width: "100%", height: s.swooshHeight, marginTop: s.swooshMargin }}
        viewBox="0 0 440 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M 10 16 Q 80 7 150 6" stroke="#6366F1" strokeWidth={s.strokeWidth} strokeLinecap="round" />
        <path d="M 190 4 Q 302 2 430 14" stroke="#6366F1" strokeWidth={s.strokeWidth} strokeLinecap="round" />
      </svg>
    </span>
  );
}
