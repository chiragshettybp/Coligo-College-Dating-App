// ============================================================================
// Match Celebration — the emotional climax of the product
// ----------------------------------------------------------------------------
// Not a popup: a premium cinematic moment. The background slows and blurs,
// warm ambient light blooms, two avatars travel together into a shared white
// glow, details reveal progressively, and a soft chime + warm success haptic
// land on the peak. Choosing "Send Message" does not open a new page — the
// celebration *continues*: the avatars shrink into a chat header and the
// composer grows from below, so the conversation feels like one unbroken moment.
//
// Never cheesy hearts. Never confetti. Never gaming effects. Reuses the global
// motion / haptic systems and fully respects Reduce Motion.
// ============================================================================
import * as React from "react";
import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import {
  MessageCircle,
  GraduationCap,
  CalendarDays,
  Sparkles,
  Heart,
  ArrowUp,
  X,
} from "lucide-react";

import { colors, radii, spacing, surfaces, type, prefersReducedMotion } from "@/lib/ds";
import { haptic } from "@/lib/haptics";
import { Avatar, Button } from "@/components/ds/glass";

const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** A soft, refined success chime via WebAudio — no asset, never arcade. */
function playMatchChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    // Gentle rising perfect fifth (A4 -> E5), soft sine bloom.
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = now + i * 0.12;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.11, t0 + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + 1.2);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1600);
  } catch {
    /* audio unavailable — visuals + haptics still carry the moment */
  }
}

function GlassPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 backdrop-blur-xl"
      style={{
        borderRadius: radii.pill,
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "-0.005em",
        color: colors.textPrimary,
        background: "rgba(255,255,255,0.72)",
        border: `1px solid ${surfaces.border}`,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)",
      }}
    >
      {children}
    </span>
  );
}

export type MatchProfile = { src: string; name: string };
export type MatchShared = {
  college: string;
  semester: string;
  interests: string[];
  compatibility: number;
  /** One warm, specific opener seeded into the composer. */
  conversationStarter: string;
};

type Phase = "in" | "reveal" | "chat";

export function MatchCelebration({
  open,
  left,
  right,
  shared,
  onClose,
  onOpenChat,
}: {
  open: boolean;
  left: MatchProfile;
  right: MatchProfile;
  shared: MatchShared;
  /** "Keep Swiping" — dismiss the moment. */
  onClose: () => void;
  /** Fired when the user actually sends the first message from the composer. */
  onOpenChat: (message: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>("in");
  const [draft, setDraft] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const reduce = prefersReducedMotion();
  const revealed = phase === "reveal" || phase === "chat";
  const chat = phase === "chat";

  // Low-count, low-opacity ambient light particles — never confetti.
  const particles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        left: 8 + Math.random() * 84,
        top: 40 + Math.random() * 24,
        size: 3 + Math.random() * 4,
        opacity: 0.18 + Math.random() * 0.3,
        delay: Math.random() * 4,
        dur: 5 + Math.random() * 4,
      })),
    [],
  );

  // Reset + entrance choreography whenever the moment opens.
  useLayoutEffect(() => {
    if (!open) {
      setPhase("in");
      setDraft("");
      return;
    }
    const soft = prefersReducedMotion();

    rootRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: soft ? 0 : 380,
      easing: EASE,
      fill: "both",
    });

    if (!soft) {
      // Avatars travel in from the sides with depth — never fade, never pop.
      leftRef.current?.animate(
        [
          { transform: "translateX(-72px) translateY(6px) scale(0.66)", opacity: 0 },
          { transform: "translateX(0) translateY(0) scale(1)", opacity: 1 },
        ],
        { duration: 760, easing: SPRING, fill: "both" },
      );
      rightRef.current?.animate(
        [
          { transform: "translateX(72px) translateY(6px) scale(0.66)", opacity: 0 },
          { transform: "translateX(0) translateY(0) scale(1)", opacity: 1 },
        ],
        { duration: 760, easing: SPRING, fill: "both", delay: 70 },
      );
    }

    // Peak: progressive reveal + warm haptic + soft chime, synchronized.
    const peak = window.setTimeout(
      () => {
        setPhase("reveal");
        haptic("match");
        playMatchChime();
      },
      soft ? 0 : 560,
    );
    return () => window.clearTimeout(peak);
  }, [open]);

  // Escape to dismiss + focus trap — keep keyboard focus inside the moment.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = rootRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while the moment is on screen.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Continuation: entering chat gently focuses the composer.
  useEffect(() => {
    if (phase !== "chat") return;
    haptic("light");
    const t = window.setTimeout(() => inputRef.current?.focus(), reduce ? 0 : 520);
    return () => window.clearTimeout(t);
  }, [phase, reduce]);

  if (!open) return null;

  const reveal = (i: number): React.CSSProperties => ({
    opacity: revealed && !chat ? 1 : 0,
    transform: revealed && !chat ? "translateY(0)" : "translateY(12px)",
    transition: reduce
      ? "none"
      : `opacity 0.42s ${EASE} ${0.04 + i * 0.08}s, transform 0.55s ${SPRING} ${0.04 + i * 0.08}s`,
    pointerEvents: chat ? "none" : undefined,
  });

  const chatIn = (i: number): React.CSSProperties => ({
    opacity: chat ? 1 : 0,
    transform: chat ? "translateY(0)" : "translateY(14px)",
    transition: reduce
      ? "none"
      : `opacity 0.4s ${EASE} ${0.12 + i * 0.08}s, transform 0.55s ${SPRING} ${0.12 + i * 0.08}s`,
  });

  const indicators = [
    { icon: <GraduationCap style={{ width: 15, height: 15 }} />, label: shared.college },
    { icon: <CalendarDays style={{ width: 15, height: 15 }} />, label: shared.semester },
    { icon: <Heart style={{ width: 15, height: 15 }} />, label: `${shared.compatibility}% compatibility` },
  ];

  const send = () => {
    const msg = draft.trim() || shared.conversationStarter;
    haptic("messageSent");
    onOpenChat(msg);
  };

  // The avatar cluster is a single shared element that physically travels from
  // the centre of the celebration up into the chat header — the continuity.
  const clusterStyle: React.CSSProperties = {
    transform: chat ? "translateY(-4px) scale(0.5)" : "translateY(0) scale(1)",
    transition: reduce ? "none" : `transform 0.66s ${SPRING}`,
    marginBottom: chat ? spacing[1] : "clamp(8px, 2vh, 24px)",
    willChange: "transform",
  };

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={chat ? `Chat with ${right.name}` : `It's a match with ${right.name}`}
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ zIndex: 80, height: "100dvh", padding: "clamp(12px, 3.5vw, 24px)" }}
    >
      {/* Backdrop — bright frosted light + gentle warm bloom, softly blurred. */}
      <div
        onClick={onClose}
        className="absolute inset-0 backdrop-blur-2xl"
        style={{
          background:
            "radial-gradient(70% 50% at 50% 30%, rgba(120,150,255,0.22) 0%, rgba(255,255,255,0) 58%)," +
            "radial-gradient(90% 60% at 50% 28%, rgba(255,210,160,0.22) 0%, rgba(255,255,255,0) 56%)," +
            "radial-gradient(120% 90% at 50% 122%, rgba(10,132,255,0.12) 0%, rgba(255,255,255,0) 60%)," +
            "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(246,247,250,0.98) 100%)",
        }}
      />

      {/* Ambient light particles — minimal, low opacity, drifting upward. */}
      <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: "none" }}>
        {particles.map((p) => (
          <span
            key={p.id}
            className="ds-match-particle absolute rounded-full"
            style={
              {
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: p.size,
                height: p.size,
                background: "rgba(10,132,255,0.5)",
                boxShadow: "0 0 8px rgba(120,150,255,0.5)",
                opacity: chat ? 0.3 : 1,
                transition: `opacity 0.5s ${EASE}`,
                "--p-opacity": p.opacity,
                "--p-delay": `${p.delay}s`,
                "--p-dur": `${p.dur}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative flex w-full flex-col items-center text-center" style={{ maxWidth: 380, maxHeight: "100%" }}>
        {/* Shared avatar cluster — travels from centre into the chat header. */}
        <div className="relative flex items-center justify-center" style={{ ...clusterStyle, height: "clamp(112px, 18vh, 168px)" }}>
          <div
            className="ds-match-halo absolute rounded-full"
            style={{
              width: 240,
              height: 240,
              background:
                "radial-gradient(circle at 50% 50%, rgba(120,150,255,0.30) 0%, rgba(255,214,170,0.16) 34%, rgba(255,255,255,0) 68%)",
              filter: "blur(8px)",
              pointerEvents: "none",
              opacity: chat ? 0.5 : 1,
              transition: `opacity 0.5s ${EASE}`,
            }}
          />
          <div ref={leftRef} className="relative" style={{ marginRight: -22, zIndex: 2 }}>
            <div className="ds-match-breathe">
              <Avatar src={left.src} size="xl" ring />
            </div>
          </div>
          <div ref={rightRef} className="relative" style={{ marginLeft: -22, zIndex: 1 }}>
            <div className="ds-match-breathe" style={{ animationDelay: "0.4s" }}>
              <Avatar src={right.src} size="xl" ring />
            </div>
          </div>
          {/* Elegant reflection — a soft mirrored sheen pooled beneath the pair. */}
          <div
            aria-hidden
            className="absolute"
            style={{
              left: "50%",
              bottom: 6,
              width: 200,
              height: 46,
              transform: "translateX(-50%)",
              background:
                "radial-gradient(60% 100% at 50% 0%, rgba(180,205,255,0.28) 0%, rgba(180,205,255,0) 70%)",
              filter: "blur(6px)",
              opacity: chat ? 0 : 0.9,
              transition: `opacity 0.5s ${EASE}`,
              pointerEvents: "none",
            }}
          />
        </div>


        {/* ---- Celebration copy (fades out as chat continues) ---- */}
        {!chat && (
          <>
            <div style={reveal(0)}>
              <span style={{ ...type.overline, color: colors.primary }}>You connected</span>
            </div>
            <h2
              style={{
                ...reveal(1),
                fontSize: "clamp(30px, 8vw, 48px)",
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: "-0.03em",
                marginTop: 6,
                background: "linear-gradient(120deg,#1c1c1e 0%,#0a84ff 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              It’s a match
            </h2>
            <p style={{ ...reveal(2), ...type.bodyLg, color: colors.textSecondary, marginTop: 6 }}>
              You and <span style={{ color: colors.textPrimary, fontWeight: 600 }}>{right.name}</span> liked each other
            </p>

            {/* Connection indicators — reveal progressively, never all at once. */}
            <div
              className="flex flex-wrap items-center justify-center"
              style={{ gap: spacing[1], marginTop: "clamp(10px, 2vh, 20px)" }}
            >
              {indicators.map((it, i) => (
                <div key={it.label} style={reveal(3 + i)}>
                  <GlassPill>
                    <span style={{ color: colors.primary, display: "inline-flex" }}>{it.icon}</span>
                    {it.label}
                  </GlassPill>
                </div>
              ))}
            </div>

            {/* Shared interests — the real thing, each chip revealed in turn. */}
            {shared.interests.length > 0 && (
              <div style={{ ...reveal(3 + indicators.length), marginTop: spacing[3], width: "100%" }}>
                <span style={{ ...type.caption, color: colors.textMuted }}>You both like</span>
                <div className="flex flex-wrap items-center justify-center" style={{ gap: spacing[1], marginTop: spacing[2] }}>
                  {shared.interests.map((interest) => (
                    <span
                      key={interest}
                      className="inline-flex items-center gap-1.5"
                      style={{
                        borderRadius: radii.pill,
                        padding: "6px 12px",
                        ...type.badgeLabel,
                        color: colors.primaryDeep,
                        background: "rgba(10,132,255,0.10)",
                        border: "1px solid rgba(10,132,255,0.22)",
                      }}
                    >
                      <Sparkles style={{ width: 13, height: 13 }} />
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation starter — a warm, specific opener. */}
            <div
              style={{
                ...reveal(4 + indicators.length),
                marginTop: spacing[5],
                width: "100%",
              }}
            >
              <div
                className="flex items-start gap-2 text-left"
                style={{
                  borderRadius: radii.lg,
                  padding: spacing[3],
                  background: "rgba(255,255,255,0.7)",
                  border: `1px solid ${surfaces.border}`,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                <span style={{ color: colors.primary, display: "inline-flex", marginTop: 1 }}>
                  <Sparkles style={{ width: 16, height: 16 }} />
                </span>
                <div>
                  <span style={{ ...type.caption, color: colors.textMuted }}>Conversation starter</span>
                  <p style={{ ...type.body, color: colors.textPrimary, marginTop: 2 }}>{shared.conversationStarter}</p>
                </div>
              </div>
            </div>

            {/* CTAs emerge with a small spring lift. */}
            <div className="w-full" style={{ marginTop: spacing[5] }}>
              <div style={reveal(5 + indicators.length)}>
                <Button
                  variant="primary"
                  size="lg"
                  pill
                  fullWidth
                  leftIcon={<MessageCircle style={{ width: 20, height: 20 }} />}
                  onClick={() => setPhase("chat")}
                >
                  Send Message
                </Button>
              </div>
              <div style={{ ...reveal(6 + indicators.length), marginTop: spacing[2] }}>
                <Button variant="glass" size="lg" pill fullWidth onClick={onClose}>
                  Keep Swiping
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ---- Chat continuation ---- the moment becomes the conversation ---- */}
        {chat && (
          <div className="w-full">
            <div style={chatIn(0)}>
              <p style={{ ...type.headingSm, color: colors.textPrimary }}>{right.name}</p>
              <p style={{ ...type.caption, color: colors.textMuted, marginTop: 2 }}>
                You matched just now · {shared.college}
              </p>
            </div>

            {/* Intro bubble — the conversation starter, ready to send. */}
            <div style={{ ...chatIn(1), marginTop: spacing[5] }}>
              <div
                className="text-left"
                style={{
                  display: "inline-block",
                  maxWidth: "84%",
                  borderRadius: `${radii.lg}px ${radii.lg}px ${radii.lg}px ${radii.sm}px`,
                  padding: `${spacing[2]}px ${spacing[3]}px`,
                  background: "rgba(255,255,255,0.8)",
                  border: `1px solid ${surfaces.border}`,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  color: colors.textPrimary,
                  ...type.body,
                }}
              >
                Say hi to {right.name} 👋
              </div>
            </div>

            {/* Composer grows from below. */}
            <div
              style={{
                marginTop: spacing[6],
                transform: chat ? "translateY(0)" : "translateY(120%)",
                opacity: chat ? 1 : 0,
                transition: reduce ? "none" : `transform 0.6s ${SPRING} 0.14s, opacity 0.4s ${EASE} 0.14s`,
              }}
            >
              <div
                className="flex items-center gap-2"
                style={{
                  borderRadius: radii.pill,
                  padding: `6px 6px 6px ${spacing[4]}px`,
                  background: "rgba(255,255,255,0.9)",
                  border: `1px solid ${surfaces.border}`,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send();
                  }}
                  placeholder={shared.conversationStarter}
                  className="flex-1 bg-transparent outline-none"
                  style={{
                    ...type.inputText,
                    color: colors.textPrimary,
                    minWidth: 0,
                  }}
                />
                <button
                  onClick={send}
                  aria-label="Send message"
                  className="ds-press flex items-center justify-center rounded-full"
                  style={{
                    width: 40,
                    height: 40,
                    flex: "0 0 auto",
                    background: "linear-gradient(180deg, #0a84ff 0%, #0071e3 100%)",
                    color: "#fff",
                    boxShadow: "0 4px 14px rgba(10,132,255,0.4)",
                  }}
                >
                  <ArrowUp style={{ width: 20, height: 20 }} />
                </button>
              </div>
              <button
                onClick={onClose}
                className="ds-press"
                style={{
                  ...type.caption,
                  marginTop: spacing[3],
                  color: colors.textMuted,
                  background: "transparent",
                }}
              >
                Keep swiping instead
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accessible close affordance. */}
      <button
        onClick={onClose}
        aria-label="Close match celebration"
        className="ds-press absolute flex items-center justify-center rounded-full backdrop-blur-xl"
        style={{
          top: `calc(${spacing[4]}px + env(safe-area-inset-top))`,
          right: spacing[4],
          width: 40,
          height: 40,
          background: "rgba(255,255,255,0.72)",
          border: `1px solid ${surfaces.border}`,
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          color: colors.textPrimary,
        }}
      >
        <X style={{ width: 20, height: 20 }} />
      </button>
    </div>
  );
}
