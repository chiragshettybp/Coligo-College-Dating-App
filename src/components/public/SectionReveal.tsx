import type { ReactNode } from "react";

import { useReveal } from "./useReveal";
import { easing, durationMs } from "@/lib/motion";

/**
 * Wraps a section and reveals it on scroll (fade + subtle lift). Honors
 * reduced-motion via useReveal. `delay` staggers grouped children.
 */
export function SectionReveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  as?: "div" | "section" | "li" | "article";
  className?: string;
  style?: React.CSSProperties;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <Tag
      ref={ref as never}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(18px)",
        transition: `opacity ${durationMs.hero}ms ${easing.easeOut} ${delay}ms, transform ${durationMs.hero}ms ${easing.easeOut} ${delay}ms`,
        willChange: "opacity, transform",
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
