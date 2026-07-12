// ============================================================================
// Chat design system — the single source of truth for every chat surface.
// Extracted verbatim from the /ui showcase and generalized to accept real data
// (text, time, delivery state, avatars, image URLs, composer handlers) while
// keeping identical markup and styling. Both /ui and the /chat module import
// from here so the visual language never diverges.
// ============================================================================
import { useEffect, useRef } from "react";
import {
  ChevronLeft,
  Phone,
  Video,
  Check,
  CheckCheck,
  Play,
  Camera,
  Smile,
  ArrowUp,
  Plus,
  Mic,
  X,
} from "lucide-react";

import { colors, gradients, radii, shadows, spacing, surfaces, type, weights } from "@/lib/ds";
import { haptic } from "@/lib/haptics";
import { Avatar } from "@/components/ds/glass";

export type GroupPos = "single" | "first" | "middle" | "last";
export type MsgState = "sending" | "sent" | "delivered" | "read" | "failed";

export function bubbleRadii(mine: boolean, pos: GroupPos) {
  const R = 22;
  const tight = 7;
  const r = { tl: R, tr: R, br: R, bl: R };
  if (mine) {
    if (pos === "first") r.br = tight;
    else if (pos === "middle") { r.tr = tight; r.br = tight; }
    else if (pos === "last") r.tr = tight;
  } else {
    if (pos === "first") r.bl = tight;
    else if (pos === "middle") { r.tl = tight; r.bl = tight; }
    else if (pos === "last") r.tl = tight;
  }
  return `${r.tl}px ${r.tr}px ${r.br}px ${r.bl}px`;
}

export function Ticks({ state }: { state: MsgState }) {
  const color = state === "read" ? colors.primary : colors.textMuted;
  if (state === "failed")
    return <X style={{ width: 14, height: 14, color: colors.danger }} aria-label="Failed to send" />;
  if (state === "sending")
    return (
      <span
        className="ds-rec-pulse inline-block rounded-full"
        style={{ width: 9, height: 9, border: `1.5px solid ${colors.textMuted}` }}
        aria-label="Sending"
      />
    );
  if (state === "sent")
    return <Check style={{ width: 14, height: 14, color }} aria-label="Sent" />;
  return <CheckCheck style={{ width: 15, height: 15, color }} aria-label={state} />;
}

export function MetaRow({ mine, time, state }: { mine: boolean; time?: string; state?: MsgState }) {
  if (!time && !state) return null;
  return (
    <div
      className="flex items-center gap-1"
      style={{
        justifyContent: mine ? "flex-end" : "flex-start",
        marginTop: 3,
        paddingLeft: mine ? 0 : 6,
        paddingRight: mine ? 6 : 0,
      }}
    >
      {time && (
        <span style={{ ...type.caption, fontSize: 11, color: colors.textMuted }}>{time}</span>
      )}
      {mine && state && <Ticks state={state} />}
    </div>
  );
}

/** A single reply preview strip rendered inside a bubble. */
export function ReplyQuote({ author, text, mine }: { author: string; text: string; mine?: boolean }) {
  const accent = mine ? "rgba(255,255,255,0.85)" : colors.primary;
  const body = mine ? "rgba(255,255,255,0.85)" : colors.textSecondary;
  return (
    <div
      style={{
        borderLeft: `3px solid ${accent}`,
        paddingLeft: 8,
        marginBottom: 5,
        opacity: 0.95,
        maxWidth: "100%",
      }}
    >
      <div style={{ ...type.caption, fontWeight: weights.semibold, color: accent }} className="truncate">
        {author}
      </div>
      <div
        style={{ ...type.caption, color: body, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {text}
      </div>
    </div>
  );
}

export type ReactionGroup = { emoji: string; count: number; mine: boolean };

/** A row of reaction pills shown just below a message bubble. */
export function ReactionsRow({
  reactions,
  mine,
  onTap,
}: {
  reactions?: ReactionGroup[];
  mine?: boolean;
  onTap?: (emoji: string) => void;
}) {
  if (!reactions?.length) return null;
  return (
    <div
      className="ds-react-pop flex items-center gap-1"
      style={{ marginTop: -6, marginBottom: 2, justifyContent: mine ? "flex-end" : "flex-start", paddingLeft: mine ? 0 : 6, paddingRight: mine ? 6 : 0 }}
    >
      {reactions.map((r) => (
        <button
          key={r.emoji}
          aria-label={`${r.emoji} ${r.count}`}
          onClick={() => onTap?.(r.emoji)}
          className="flex items-center gap-0.5 rounded-full"
          style={{
            padding: "1px 7px",
            fontSize: 12,
            lineHeight: 1.6,
            background: r.mine ? "rgba(255,73,105,0.14)" : surfaces.glassSoft,
            border: `1px solid ${r.mine ? colors.primary : surfaces.borderSoft}`,
            boxShadow: shadows.soft,
            cursor: onTap ? "pointer" : "default",
          }}
        >
          <span>{r.emoji}</span>
          {r.count > 1 && (
            <span style={{ ...type.caption, fontSize: 11, color: colors.textSecondary }}>{r.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Bubble({
  children,
  mine,
  groupPos = "single",
  tail,
  time,
  state,
  reactions,
  entrance,
  reply,
  onLongPress,
  onReactionTap,
}: {
  children: React.ReactNode;
  mine?: boolean;
  groupPos?: GroupPos;
  tail?: boolean;
  time?: string;
  state?: MsgState;
  reactions?: ReactionGroup[];
  entrance?: boolean;
  reply?: { author: string; text: string } | null;
  onLongPress?: () => void;
  onReactionTap?: (emoji: string) => void;
}) {
  const isMine = !!mine;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPress = () => {
    if (!onLongPress) return;
    timer.current = setTimeout(onLongPress, 420);
  };
  const cancelPress = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  return (
    <div
      className={`flex flex-col ${entrance ? (isMine ? "ds-msg-out" : "ds-msg-in") : ""}`}
      style={{
        alignItems: isMine ? "flex-end" : "flex-start",
        marginTop: groupPos === "first" || groupPos === "single" ? 8 : 2,
      }}
    >
      <div style={{ position: "relative", maxWidth: "80%" }}>
        <div
          onPointerDown={startPress}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onContextMenu={(e) => {
            if (onLongPress) {
              e.preventDefault();
              onLongPress();
            }
          }}
          style={{
            padding: "9px 14px",
            borderRadius: bubbleRadii(isMine, groupPos),
            ...type.bodyLg,
            fontSize: 15,
            lineHeight: 1.35,
            fontWeight: weights.medium,
            color: isMine ? "#ffffff" : colors.textPrimary,
            background: isMine ? gradients.primaryButton : surfaces.glassSoft,
            border: `1px solid ${isMine ? "transparent" : surfaces.borderSoft}`,
            boxShadow: isMine ? shadows.primaryGlow : shadows.soft,
            wordBreak: "break-word",
            cursor: onLongPress ? "pointer" : undefined,
          }}
        >
          {reply ? <ReplyQuote author={reply.author} text={reply.text} mine={isMine} /> : null}
          {children}
        </div>
      </div>
      <ReactionsRow reactions={reactions} mine={isMine} onTap={onReactionTap} />
      {tail && <MetaRow mine={isMine} time={time} state={state} />}
    </div>
  );
}

export function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center" style={{ margin: "4px 0 10px" }}>
      <span
        style={{
          ...type.caption,
          color: colors.textMuted,
          background: surfaces.glassPill,
          border: `1px solid ${surfaces.borderSoft}`,
          padding: "3px 12px",
          borderRadius: radii.pill,
        }}
      >
        {label}
      </span>
    </div>
  );
}

/** Unread marker line inserted before the first unread message. */
export function UnreadDivider({ label = "Unread" }: { label?: string }) {
  return (
    <div className="flex items-center" style={{ gap: 8, margin: "10px 0 6px" }}>
      <span style={{ flex: 1, height: 1, background: colors.primary, opacity: 0.35 }} />
      <span style={{ ...type.caption, color: colors.primary, fontWeight: weights.semibold }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: colors.primary, opacity: 0.35 }} />
    </div>
  );
}

export function ChatHeader({
  name,
  avatarSrc,
  initials,
  online,
  statusText,
  onBack,
  onOpenInfo,
  onVoice,
  onVideo,
  showCalls = true,
}: {
  name: string;
  avatarSrc?: string;
  initials?: string;
  online?: boolean;
  statusText?: string;
  onBack?: () => void;
  onOpenInfo?: () => void;
  onVoice?: () => void;
  onVideo?: () => void;
  showCalls?: boolean;
}) {
  const status = statusText ?? (online ? "Active now" : "Offline");
  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: `${spacing[3]}px ${spacing[4]}px`,
        borderBottom: `1px solid ${surfaces.borderSoft}`,
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(20px)",
      }}
    >
      <button
        aria-label="Back"
        onClick={onBack}
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{ width: 36, height: 36, color: colors.primary }}
      >
        <ChevronLeft style={{ width: 24, height: 24 }} />
      </button>
      <button
        onClick={onOpenInfo}
        aria-label={`Open ${name} info`}
        className="flex min-w-0 flex-1 items-center gap-3"
        style={{ textAlign: "left" }}
      >
        <Avatar src={avatarSrc} initials={initials} size="sm" status={online ? "online" : undefined} />
        <div className="min-w-0 flex-1">
          <div style={{ ...type.titleMd, color: colors.textPrimary }} className="truncate">
            {name}
          </div>
          <div className="flex items-center gap-1.5">
            {online && (
              <span className="rounded-full" style={{ width: 7, height: 7, background: colors.success }} />
            )}
            <span style={{ ...type.caption, color: online ? colors.success : colors.textMuted }}>
              {status}
            </span>
          </div>
        </div>
      </button>
      {showCalls && (
        <>
          <button
            aria-label="Voice call"
            onClick={onVoice}
            className="flex shrink-0 items-center justify-center rounded-full"
            style={{ width: 40, height: 40, color: colors.primary, background: "rgba(120,120,128,0.10)", border: `1px solid ${surfaces.borderSoft}` }}
          >
            <Phone style={{ width: 18, height: 18 }} />
          </button>
          <button
            aria-label="Video call"
            onClick={onVideo}
            className="flex shrink-0 items-center justify-center rounded-full"
            style={{ width: 40, height: 40, color: colors.primary, background: "rgba(120,120,128,0.10)", border: `1px solid ${surfaces.borderSoft}` }}
          >
            <Video style={{ width: 18, height: 18 }} />
          </button>
        </>
      )}
    </div>
  );
}

export function TypingBubble() {
  return (
    <div className="ds-msg-in flex" style={{ marginTop: 8 }}>
      <div
        className="flex items-center gap-1.5"
        style={{
          padding: "12px 16px",
          borderRadius: "22px 22px 22px 7px",
          background: surfaces.glassSoft,
          border: `1px solid ${surfaces.border}`,
          boxShadow: shadows.soft,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="rounded-full"
            style={{
              width: 7,
              height: 7,
              background: colors.textSecondary,
              animation: `ds-typing 1.2s ${i * 0.15}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

const WAVE_BARS = [0.4, 0.7, 1, 0.6, 0.85, 0.5, 0.75, 1, 0.55, 0.9, 0.45, 0.7, 0.3, 0.6, 0.8, 0.5];

export function VoiceMessage({ mine }: { mine?: boolean }) {
  const isMine = !!mine;
  const fg = isMine ? "#ffffff" : colors.primary;
  const dim = isMine ? "rgba(255,255,255,0.4)" : "rgba(60,60,67,0.25)";
  const meta = isMine ? "rgba(255,255,255,0.85)" : colors.textMuted;
  return (
    <Bubble mine={isMine} groupPos="single" tail time="9:43" state={isMine ? "read" : undefined}>
      <div className="flex items-center gap-3" style={{ minWidth: 190 }}>
        <button
          aria-label="Play voice message"
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{ width: 34, height: 34, background: isMine ? "rgba(255,255,255,0.18)" : "rgba(10,132,255,0.12)", color: fg }}
        >
          <Play style={{ width: 15, height: 15, marginLeft: 1 }} fill="currentColor" />
        </button>
        <div className="flex flex-1 items-center gap-[3px]" style={{ height: 26 }}>
          {WAVE_BARS.map((h, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                height: `${Math.round(h * 100)}%`,
                borderRadius: 2,
                background: i < 6 ? fg : dim,
                transformOrigin: "center",
              }}
            />
          ))}
        </div>
        <span style={{ ...type.caption, color: meta }}>0:12</span>
      </div>
    </Bubble>
  );
}

/**
 * Image message. When `src` is provided it renders the real image (tap to open
 * a viewer via `onOpen`); otherwise it falls back to the showcase placeholder.
 */
export function ImageMessage({
  mine,
  time,
  state,
  src,
  alt,
  onOpen,
  uploading,
  progress,
}: {
  mine?: boolean;
  time?: string;
  state?: MsgState;
  src?: string;
  alt?: string;
  onOpen?: () => void;
  uploading?: boolean;
  progress?: number;
}) {
  const isMine = !!mine;
  return (
    <div
      className="ds-msg-out flex flex-col"
      style={{ alignItems: isMine ? "flex-end" : "flex-start", marginTop: 8 }}
    >
      <button
        onClick={onOpen}
        aria-label={alt ?? "Open image"}
        style={{
          width: 200,
          height: 148,
          borderRadius: radii.md,
          overflow: "hidden",
          border: `1px solid ${surfaces.border}`,
          boxShadow: shadows.medium,
          background: gradients.blueGloss,
          position: "relative",
          cursor: src ? "pointer" : "default",
        }}
      >
        {src ? (
          <img src={src} alt={alt ?? "Shared image"} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
        ) : (
          <>
            <div className="ds-shimmer" style={{ position: "absolute", inset: 0, opacity: 0.25 }} />
            <div className="flex h-full w-full items-center justify-center" style={{ position: "relative" }}>
              <Camera style={{ width: 30, height: 30, color: "rgba(255,255,255,0.9)" }} />
            </div>
          </>
        )}
        {uploading && (
          <div
            className="flex items-center justify-center"
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", color: "#fff", ...type.caption }}
          >
            {typeof progress === "number" ? `${Math.round(progress)}%` : "Uploading…"}
          </div>
        )}
      </button>
      <MetaRow mine={isMine} time={time} state={state} />
    </div>
  );
}

export function ComposerAction({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: 38, height: 38, color: colors.textSecondary, opacity: disabled ? 0.5 : 1 }}
    >
      {icon}
    </button>
  );
}

/**
 * Message composer. Fully controlled when `onChange`/`onSend` are supplied;
 * renders the static showcase placeholder when they are not.
 */
export function Composer({
  value = "",
  onChange,
  onSend,
  onAttach,
  onCamera,
  onEmoji,
  placeholder = "Message…",
  disabled,
  canSend,
  replyingTo,
  onCancelReply,
}: {
  value?: string;
  onChange?: (v: string) => void;
  onSend?: () => void;
  onAttach?: () => void;
  onCamera?: () => void;
  onEmoji?: () => void;
  placeholder?: string;
  disabled?: boolean;
  canSend?: boolean;
  replyingTo?: { author: string; text: string } | null;
  onCancelReply?: () => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const controlled = !!onChange;

  // Auto-resize the textarea to fit content (max ~5 lines).
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  const sendActive = canSend ?? value.trim().length > 0;

  return (
    <div style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(20px)", borderTop: `1px solid ${surfaces.borderSoft}` }}>
      {replyingTo && (
        <div
          className="flex items-center gap-2"
          style={{ padding: `${spacing[2]}px ${spacing[3]}px 0` }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <ReplyQuote author={replyingTo.author} text={replyingTo.text} />
          </div>
          <button aria-label="Cancel reply" onClick={onCancelReply} style={{ color: colors.textMuted }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
      )}
      <div
        className="flex items-end gap-2"
        style={{
          padding: `${spacing[2]}px ${spacing[3]}px calc(${spacing[3]}px + env(safe-area-inset-bottom, 0px))`,
        }}
      >
        <ComposerAction icon={<Plus style={{ width: 22, height: 22 }} />} label="Attach image" onClick={onAttach} disabled={disabled} />
        <div
          className="flex flex-1 items-center gap-2"
          style={{
            minHeight: 42,
            padding: "6px 8px 6px 16px",
            borderRadius: radii.lg,
            background: "rgba(120,120,128,0.10)",
            border: `1px solid ${surfaces.borderSoft}`,
          }}
        >
          {controlled ? (
            <textarea
              ref={taRef}
              value={value}
              rows={1}
              disabled={disabled}
              placeholder={placeholder}
              aria-label="Message"
              onChange={(e) => onChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (sendActive) onSend?.();
                }
              }}
              style={{
                flex: 1,
                resize: "none",
                border: "none",
                outline: "none",
                background: "transparent",
                maxHeight: 120,
                ...type.bodyLg,
                fontSize: 15,
                color: colors.textPrimary,
                fontFamily: "inherit",
                lineHeight: 1.4,
              }}
            />
          ) : (
            <span style={{ ...type.bodyLg, fontSize: 15, color: colors.textMuted, flex: 1 }}>{placeholder}</span>
          )}
          <button aria-label="Camera" onClick={onCamera} className="flex shrink-0 items-center justify-center" style={{ color: colors.textSecondary }}>
            <Camera style={{ width: 21, height: 21 }} />
          </button>
          <button aria-label="Emoji" onClick={onEmoji} className="flex shrink-0 items-center justify-center" style={{ color: colors.textSecondary }}>
            <Smile style={{ width: 21, height: 21 }} />
          </button>
        </div>
        <button
          aria-label="Send"
          disabled={disabled || !sendActive}
          onPointerDown={() => haptic("messageSent")}
          onClick={() => sendActive && onSend?.()}
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{
            width: 42,
            height: 42,
            background: gradients.primaryButton,
            boxShadow: shadows.primaryGlow,
            color: "#fff",
            opacity: disabled || !sendActive ? 0.5 : 1,
          }}
        >
          <ArrowUp style={{ width: 20, height: 20 }} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
