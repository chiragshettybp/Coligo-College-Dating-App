// ============================================================================
// BrandLogo — single source of truth for Coligo branding.
// Use this everywhere instead of embedding the logo image or a Heart icon.
// Supports logo-only, logo + wordmark, configurable size, and responsive
// scaling. Works on both light and dark surfaces via the design system.
// ============================================================================
import { Text } from "@/components/ds/glass";
import { colors } from "@/lib/ds";
import logo from "@/assets/coligo-logo.png";

type WordmarkVariant =
  | "displaySm"
  | "headingLg"
  | "headingSm"
  | "title"
  | "body";

export interface BrandLogoProps {
  /** Show the "Coligo" wordmark next to the logo mark. */
  showWordmark?: boolean;
  /** Pixel size of the logo mark (square). */
  size?: number;
  /** Typography role for the wordmark. */
  wordmarkVariant?: WordmarkVariant;
  /** Wordmark color — defaults to primary text (theme-aware). */
  wordmarkColor?: string;
  /** Load eagerly (above-the-fold marks) instead of lazily. */
  eager?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * The Coligo brand lockup. The image already ships with a transparent
 * background, so it sits cleanly on any surface.
 */
export function BrandLogo({
  showWordmark = true,
  size = 32,
  wordmarkVariant = "headingSm",
  wordmarkColor = colors.textPrimary,
  eager = false,
  className,
  style,
}: BrandLogoProps) {
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.28), ...style }}
    >
      <img
        src={logo}
        alt="Coligo"
        width={size}
        height={size}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={{ width: size, height: size, objectFit: "contain", display: "block", flexShrink: 0 }}
      />
      {showWordmark ? (
        <Text variant={wordmarkVariant} color={wordmarkColor}>
          Coligo
        </Text>
      ) : null}
    </span>
  );
}
