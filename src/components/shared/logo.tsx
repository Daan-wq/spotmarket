interface LogoProps {
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "18px",
  md: "24px",
  lg: "64px",
};

export function Logo({ variant = "dark", size = "sm" }: LogoProps) {
  const color = variant === "dark" ? "#FFFFFF" : "#010405";

  return (
    <span
      style={{
        fontSize: SIZES[size],
        fontWeight: 900,
        fontStyle: "italic",
        color,
        lineHeight: 1,
        whiteSpace: "nowrap",
        letterSpacing: "-0.02em",
        textTransform: "uppercase",
      }}
    >
      €lipprofit
    </span>
  );
}
