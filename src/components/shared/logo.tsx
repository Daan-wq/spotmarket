interface LogoProps {
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "18px",
  md: "24px",
  lg: "64px",
};

export function Logo({ variant = "light", size = "sm" }: LogoProps) {
  const color = variant === "dark" ? "#ffffff" : "#010405";

  return (
    <span
      style={{
        color,
        fontSize: SIZES[size],
        fontWeight: 900,
        fontStyle: "italic",
        letterSpacing: 0,
        lineHeight: 1,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      ClipProfit
    </span>
  );
}
