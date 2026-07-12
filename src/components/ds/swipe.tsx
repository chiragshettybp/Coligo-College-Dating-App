// ============================================================================
// Swipe system — production, data-driven components extracted from the /ui
// design language (SwipeCard / SwipeDeck / SwipeControls / overlays). Same
// tokens, motion and gesture physics; no redesign. Fully touch + mouse-drag +
// keyboard driven, reduced-motion aware.
// ============================================================================
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Heart, X, Star, RotateCcw, ShieldCheck, GraduationCap, ImageOff, Sparkles } from "lucide-react";

import {
  colors,
  radii,
  shadows,
  spacing,
  surfaces,
  prefersReducedMotion,
} from "@/lib/ds";
import { haptic, type HapticToken } from "@/lib/haptics";
import { Badge, GlassPanel } from "@/components/ds/glass";
import type { DiscoverCard } from "@/lib/discover.functions";

const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const THRESHOLD = 110;

export type SwipeDecision = "like" | "pass" | "super";

/* --------------------------------------------------------------- helpers -- */

function classYear(gradYear: number | null): string | null {
  if (!gradYear) return null;
  return `Class of '${String(gradYear).slice(-2)}`;
}

/* ---------------------------------------------------------- PhotoCarousel -- */

export function PhotoCarousel({
  photos,
  height = 440,
  radius = radii.lg,
}: {
  photos: string[];
  height?: number;
  radius?: number;
}) {
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const count = photos.length;

  useEffect(() => {
    setIdx(0);
  }, [photos]);

  const go = (dir: 1 | -1) => {
    if (count <= 1) return;
    haptic("selection");
    setLoaded(false);
    setIdx((i) => (i + dir + count) % count);
  };

  if (count === 0) {
    return (
      <div
        style={{
          height,
          borderRadius: radius,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing[2],
          background: "linear-gradient(180deg, #1b1f2a 0%, #10131b 100%)",
          color: colors.textMuted,
        }}
      >
        <ImageOff style={{ width: 34, height: 34 }} />
        <span style={{ fontSize: 13 }}>No photos yet</span>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height, borderRadius: radius, overflow: "hidden" }}>
      {!loaded && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ background: "linear-gradient(180deg, #1b1f2a 0%, #10131b 100%)" }}
        />
      )}
      <img
        src={photos[idx]}
        alt=""
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className="h-full w-full object-cover"
        style={{
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.32s ease",
        }}
      />

      {/* page indicator */}
      {count > 1 && (
        <div
          className="absolute flex gap-1.5"
          style={{ top: spacing[2], left: spacing[3], right: spacing[3], zIndex: 3 }}
        >
          {photos.map((_, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: radii.pill,
                background: i === idx ? "#fff" : "rgba(255,255,255,0.32)",
                boxShadow: i === idx ? "0 0 8px rgba(255,255,255,0.6)" : "none",
                transition: "background 0.2s ease",
              }}
            />
          ))}
        </div>
      )}

      {/* tap zones */}
      {count > 1 && (
        <>
          <button
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            style={{ position: "absolute", inset: "0 auto 0 0", width: "34%", zIndex: 2, background: "transparent", border: "none", cursor: "pointer" }}
          />
          <button
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            style={{ position: "absolute", inset: "0 0 0 auto", width: "34%", zIndex: 2, background: "transparent", border: "none", cursor: "pointer" }}
          />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Stamp -- */

function Stamp({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-block backdrop-blur-md"
      style={{
        padding: "7px 16px",
        borderRadius: radii.sm,
        border: `2.5px solid ${color}`,
        background: `${color}1f`,
        color,
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: "0.08em",
        textShadow: `0 0 24px ${color}`,
        boxShadow: `0 0 30px ${color}55, inset 0 0 20px ${color}22`,
      }}
    >
      {label}
    </span>
  );
}

function MiniTag({ children, mutual = false }: { children: React.ReactNode; mutual?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: radii.pill,
        fontSize: 12,
        fontWeight: 600,
        color: mutual ? "#fff" : "rgba(255,255,255,0.9)",
        background: mutual ? colors.success : "rgba(255,255,255,0.14)",
        border: mutual ? "none" : "1px solid rgba(255,255,255,0.12)",
      }}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- SwipeCard -- */

export function SwipeCard({
  card,
  online = false,
  onOpenProfile,
  interactivePhotos = false,
}: {
  card: DiscoverCard;
  online?: boolean;
  onOpenProfile?: () => void;
  interactivePhotos?: boolean;
}) {
  const cls = classYear(card.graduationYear);
  const mutual = new Set(card.mutualInterests);
  const shownInterests = card.interests.slice(0, 4);

  return (
    <GlassPanel style={{ padding: 0, overflow: "hidden", boxShadow: shadows.large }}>
      <div style={{ position: "relative", height: 440 }} onClick={onOpenProfile}>
        {interactivePhotos ? (
          <PhotoCarousel photos={card.photos} radius={0} />
        ) : card.photos[0] ? (
          <img src={card.photos[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-2"
            style={{ background: "linear-gradient(180deg, #1b1f2a 0%, #10131b 100%)", color: colors.textMuted }}
          >
            <ImageOff style={{ width: 34, height: 34 }} />
          </div>
        )}

        {/* top status row */}
        <div
          className="absolute flex items-center justify-between"
          style={{ top: spacing[4], left: spacing[3], right: spacing[3], zIndex: 3, pointerEvents: "none" }}
        >
          <span />
          {online && (
            <span
              className="inline-flex items-center gap-1.5 backdrop-blur-md"
              style={{
                borderRadius: radii.pill,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 600,
                color: "#fff",
                background: "rgba(0,0,0,0.35)",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: colors.success,
                  boxShadow: `0 0 8px ${colors.success}`,
                }}
              />
              Online
            </span>
          )}
        </div>

        {/* fade + vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(120% 80% at 50% 0%, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 45%)," +
              "linear-gradient(180deg, transparent 42%, rgba(3,6,14,0.55) 72%, rgba(3,6,14,0.94) 100%)",
          }}
        />

        {/* info */}
        <div
          className="absolute"
          style={{ left: spacing[4], right: spacing[4], bottom: spacing[4], pointerEvents: "none" }}
        >
          <div className="flex items-center" style={{ gap: spacing[1] }}>
            <span
              style={{
                color: "#fff",
                fontSize: 27,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
              }}
            >
              {card.fullName ?? "Someone"}
              {card.age ? `, ${card.age}` : ""}
            </span>
            <Badge tone="success">
              <ShieldCheck style={{ width: 12, height: 12 }} />
            </Badge>
          </div>
          {(card.departmentName || cls) && (
            <div
              className="mt-1 flex items-center gap-1.5"
              style={{ color: "#fff", fontSize: 13, fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,0.55)" }}
            >
              <GraduationCap style={{ width: 14, height: 14 }} />
              {[card.departmentName, cls].filter(Boolean).join(" · ")}
            </div>
          )}
          {card.collegeName && (
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 12.5, marginTop: 2, textShadow: "0 1px 3px rgba(0,0,0,0.55)" }}>
              {card.collegeName}
              {card.sameCollege ? " · Same campus" : ""}
            </div>
          )}
          {card.bio && (
            <p
              style={{
                color: "rgba(255,255,255,0.82)",
                fontSize: 13,
                lineHeight: 1.4,
                marginTop: spacing[1],
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {card.bio}
            </p>
          )}
          {shownInterests.length > 0 && (
            <div className="mt-3 flex flex-wrap" style={{ gap: spacing[1] }}>
              {shownInterests.map((it) => (
                <MiniTag key={it} mutual={mutual.has(it)}>
                  {mutual.has(it) && <Sparkles style={{ width: 11, height: 11 }} />}
                  {it}
                </MiniTag>
              ))}
            </div>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}

/* ----------------------------------------------------------- SwipeControl -- */

function SwipeControl({
  children,
  label,
  size = 52,
  tint,
  primary = false,
  hapticToken,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  label?: string;
  size?: number;
  tint: string;
  primary?: boolean;
  hapticToken?: HapticToken;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const surface = primary
    ? `radial-gradient(115% 115% at 50% 8%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0) 68%), linear-gradient(180deg, ${tint} 0%, ${tint}d0 100%)`
    : `radial-gradient(120% 120% at 50% 12%, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 42%, rgba(255,255,255,0) 72%), linear-gradient(180deg, #20242f 0%, #14161e 100%)`;
  const shadow = primary
    ? "0 1px 1px rgba(0,0,0,0.35), 0 10px 26px rgba(0,0,0,0.34), inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -2px 4px rgba(0,0,0,0.22)"
    : "0 1px 2px rgba(0,0,0,0.4), 0 9px 22px rgba(0,0,0,0.32), inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.4)";

  return (
    <div className="flex flex-col items-center" style={{ gap: spacing[2] }}>
      <button
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        onPointerDown={() => !disabled && haptic(hapticToken ?? (primary ? "softSuccess" : "selection"))}
        className="ds-swipe-btn relative flex shrink-0 items-center justify-center rounded-full will-change-transform"
        style={{
          width: size,
          height: size,
          color: primary ? "#fff" : tint,
          background: surface,
          border: `1px solid ${primary ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.08)"}`,
          boxShadow: shadow,
          opacity: disabled ? 0.45 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "opacity 0.2s ease, transform 0.12s ease",
        }}
      >
        <span className="relative flex items-center justify-center">{children}</span>
      </button>
      {label && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: colors.textMuted,
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- SwipeDeck -- */

export type SwipeDeckHandle = { swipe: (action: SwipeDecision) => void };

export const SwipeDeck = forwardRef<
  SwipeDeckHandle,
  {
    /** Ordered; index 0 is the top card. */
    cards: DiscoverCard[];
    /** Fired when the top card leaves the stack. Parent removes it + persists. */
    onDecision: (card: DiscoverCard, action: SwipeDecision) => void;
    onOpenProfile?: (card: DiscoverCard) => void;
    onlineIds?: Set<string>;
    busy?: boolean;
  }
>(function SwipeDeck({ cards, onDecision, onOpenProfile, onlineIds, busy = false }, ref) {
  const reduce = prefersReducedMotion();
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<{ x: number; y: number } | null>(null);
  const start = useRef({ x: 0, y: 0, t: 0 });
  const last = useRef({ x: 0, y: 0, t: 0, vx: 0, vy: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const top = cards[0];
  const topId = top?.id;


  useEffect(() => {
    // New top card — reset transient motion state.
    setDrag({ x: 0, y: 0 });
    setDragging(false);
    setLeaving(null);
  }, [topId]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const commit = useCallback(
    (action: SwipeDecision) => {
      if (!top || leaving || busy) return;
      const dir = action === "like" ? 1 : action === "pass" ? -1 : 0;
      const upY = action === "super" ? -1 : 0;
      haptic(action === "pass" ? "swipeSnap" : action === "super" ? "heavy" : "softSuccess");
      const dest = { x: dir * 640, y: upY * 720 };
      if (reduce) {
        onDecision(top, action);
        return;
      }
      setLeaving(dest);
      timer.current = setTimeout(() => onDecision(top, action), 280);
    },
    [top, leaving, busy, reduce, onDecision],
  );

  useImperativeHandle(ref, () => ({ swipe: (action) => commit(action) }), [commit]);



  // keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!top || leaving || busy) return;
      if (e.key === "ArrowRight") commit("like");
      else if (e.key === "ArrowLeft") commit("pass");
      else if (e.key === "ArrowUp") commit("super");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [commit, top, leaving, busy]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (leaving || busy) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const now = performance.now();
    start.current = { x: e.clientX, y: e.clientY, t: now };
    last.current = { x: e.clientX, y: e.clientY, t: now, vx: 0, vy: 0 };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    const dt = Math.max(1, now - last.current.t);
    last.current = {
      x: e.clientX,
      y: e.clientY,
      t: now,
      vx: (e.clientX - last.current.x) / dt,
      vy: (e.clientY - last.current.y) / dt,
    };
    setDrag({ x: dx, y: dy });
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    const { vx, vy } = last.current;
    const moved = Math.hypot(drag.x, drag.y);
    const flingLeft = drag.x < -THRESHOLD || vx < -0.6;
    const flingRight = drag.x > THRESHOLD || vx > 0.6;
    const flingUp = drag.y < -THRESHOLD || vy < -0.6;
    if (moved < 8) {
      // treat as tap → open profile
      if (top) onOpenProfile?.(top);
      setDrag({ x: 0, y: 0 });
      return;
    }
    if (flingUp && Math.abs(drag.y) > Math.abs(drag.x)) commit("super");
    else if (flingRight) commit("like");
    else if (flingLeft) commit("pass");
    else setDrag({ x: 0, y: 0 });
  };

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const activeX = leaving ? leaving.x : drag.x;
  const activeY = leaving ? leaving.y : drag.y;
  const rotation = activeX / 18;
  const likeOp = clamp01(drag.x / THRESHOLD);
  const nopeOp = clamp01(-drag.x / THRESHOLD);
  const superOp = clamp01(-drag.y / THRESHOLD);
  const progress = clamp01(Math.hypot(drag.x, drag.y) / 140);
  const secondScale = 0.95 + 0.05 * progress;
  const secondY = 11 * (1 - progress);
  const thirdScale = 0.9 + 0.05 * progress;
  const thirdY = 22 - 11 * progress;

  const frontTransition = dragging
    ? "none"
    : `transform ${leaving ? 0.28 : 0.34}s ${leaving ? "cubic-bezier(0.4,0,0.6,1)" : SPRING}, opacity 0.28s ease`;

  if (!top) return null;

  const behind = cards.slice(1, 3);

  return (
    <div style={{ position: "relative", touchAction: "none", userSelect: "none" }}>
      {behind[1] && (
        <div
          className="absolute inset-0"
          style={{
            transform: `translateY(${thirdY}px) scale(${thirdScale})`,
            opacity: 0.35 + 0.25 * progress,
            transition: dragging ? "none" : "transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.32s ease",
          }}
        >
          <div style={{ height: "100%", borderRadius: radii.lg, background: surfaces.glass, border: `1px solid ${surfaces.borderSoft}`, boxShadow: shadows.medium }} />
        </div>
      )}
      {behind[0] && (
        <div
          className="absolute inset-0"
          style={{
            transform: `translateY(${secondY}px) scale(${secondScale})`,
            opacity: 0.6 + 0.4 * progress,
            transition: dragging ? "none" : "transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.32s ease",
          }}
        >
          <SwipeCard card={behind[0]} online={!!onlineIds?.has(behind[0].id)} />
        </div>
      )}

      {/* top card */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "relative",
          transform: `translate3d(${activeX}px, ${activeY}px, 0) rotate(${rotation}deg)`,
          opacity: leaving ? 0 : 1,
          transition: frontTransition,
          cursor: dragging ? "grabbing" : "grab",
          willChange: "transform",
        }}
      >
        <SwipeCard
          card={top}
          online={!!onlineIds?.has(top.id)}
          onOpenProfile={() => onOpenProfile?.(top)}
        />
        <div className="pointer-events-none absolute" style={{ top: spacing[6], left: spacing[4], opacity: likeOp, transform: `rotate(-12deg) scale(${0.9 + 0.1 * likeOp})` }}>
          <Stamp label="LIKE" color={colors.success} />
        </div>
        <div className="pointer-events-none absolute" style={{ top: spacing[6], right: spacing[4], opacity: nopeOp, transform: `rotate(12deg) scale(${0.9 + 0.1 * nopeOp})` }}>
          <Stamp label="NOPE" color={colors.danger} />
        </div>
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ bottom: 120, opacity: superOp, transform: `translateX(-50%) scale(${0.9 + 0.1 * superOp})` }}>
          <Stamp label="SUPER" color={colors.info} />
        </div>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------ SwipeControls */

export function SwipeControls({
  onPass,
  onSuper,
  onLike,
  onUndo,
  canUndo = false,
  disabled = false,
}: {
  onPass: () => void;
  onSuper: () => void;
  onLike: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-center" style={{ gap: spacing[4] }}>
      {onUndo && (
        <SwipeControl label="Undo" size={46} tint={colors.warning} hapticToken="confirm" disabled={disabled || !canUndo} onClick={onUndo}>
          <RotateCcw style={{ width: 20, height: 20 }} strokeWidth={2.6} />
        </SwipeControl>
      )}
      <SwipeControl label="Nope" size={58} tint={colors.danger} hapticToken="swipeSnap" disabled={disabled} onClick={onPass}>
        <X style={{ width: 26, height: 26 }} strokeWidth={2.8} />
      </SwipeControl>
      <SwipeControl label="Super" size={52} tint={colors.info} hapticToken="heavy" disabled={disabled} onClick={onSuper}>
        <Star style={{ width: 22, height: 22 }} fill="currentColor" />
      </SwipeControl>
      <SwipeControl label="Like" size={68} tint={colors.success} primary hapticToken="softSuccess" disabled={disabled} onClick={onLike}>
        <Heart style={{ width: 28, height: 28 }} fill="#fff" />
      </SwipeControl>
    </div>
  );
}
