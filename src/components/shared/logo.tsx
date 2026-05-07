interface LogoProps {
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg" | "fill";
  className?: string;
}

const SIZES = {
  sm: "18px",
  md: "24px",
  lg: "64px",
};

export function Logo({ variant = "light", size = "sm", className }: LogoProps) {
  const color = variant === "dark" ? "#ffffff" : "#010405";

  if (size === "fill") {
    return (
      <svg
        viewBox="0 0 220 40"
        preserveAspectRatio="xMinYMid meet"
        className={className}
        style={{ display: "block", width: "100%", height: "auto", maxWidth: "100%" }}
        aria-label="ClipProfit"
        role="img"
      >
        <text
          x="0"
          y="20"
          dominantBaseline="central"
          textAnchor="start"
          fill={color}
          fontWeight={900}
          fontStyle="italic"
          fontSize={30}
          textLength="210"
          lengthAdjust="spacingAndGlyphs"
          style={{ textTransform: "uppercase" }}
        >
          CLIPPROFIT
        </text>
      </svg>
    );
  }

  return (
    <span
      className={className}
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
