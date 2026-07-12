// ============================================================================
// ImageViewer — full-screen media viewer for chat images and the shared-media
// grid. Dark scrim, escape / tap-to-close, reduced-motion aware. Accessible:
// dialog role, labelled close control, focus on mount.
// ============================================================================
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { colors } from "@/lib/ds";

export function ImageViewer({
  src,
  alt = "Shared image",
  onClose,
}: {
  src: string;
  alt?: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="ds-fade-in"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(8,8,12,0.94)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <button
        ref={closeRef}
        aria-label="Close image"
        onClick={onClose}
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 14px)",
          right: 14,
          width: 42,
          height: 42,
          borderRadius: 999,
          background: "rgba(255,255,255,0.14)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X style={{ width: 22, height: 22 }} />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          borderRadius: 14,
          boxShadow: `0 8px 40px ${colors.textPrimary}55`,
        }}
      />
    </div>
  );
}
