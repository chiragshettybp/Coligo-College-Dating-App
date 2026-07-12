// ============================================================================
// VoiceMessage — a playable voice-note bubble with a waveform + scrubbing, and
// VoiceRecordingBar — the in-composer recording state (timer, cancel, send).
// The waveform is deterministically derived from the message id so it looks
// natural and stable without decoding audio on every render.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Mic, Trash2, ArrowUp } from "lucide-react";

import { colors, gradients, radii, shadows, spacing, surfaces, type, weights } from "@/lib/ds";
import { haptic } from "@/lib/haptics";
import { MetaRow, type MsgState } from "@/components/ds/chat";

const BARS = 34;

function waveform(seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out: number[] = [];
  for (let i = 0; i < BARS; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const v = (Math.abs(h) % 100) / 100; // 0..1
    out.push(0.28 + v * 0.72);
  }
  return out;
}

function fmt(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceMessage({
  id,
  mine,
  src,
  durationMs,
  time,
  state,
}: {
  id: string;
  mine?: boolean;
  src?: string | null;
  durationMs?: number | null;
  time?: string;
  state?: MsgState;
}) {
  const isMine = !!mine;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [dur, setDur] = useState(durationMs ? durationMs / 1000 : 0);
  const bars = useMemo(() => waveform(id), [id]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      if (a.duration && isFinite(a.duration)) setProgress(a.currentTime / a.duration);
    };
    const onLoaded = () => {
      if (a.duration && isFinite(a.duration)) setDur(a.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      a.currentTime = 0;
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnd);
    };
  }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    haptic("selection");
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      void a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !a.duration || !isFinite(a.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * a.duration;
    setProgress(ratio);
  };

  const fg = isMine ? "#ffffff" : colors.primary;
  const trackDim = isMine ? "rgba(255,255,255,0.4)" : "rgba(120,120,128,0.28)";
  const displayMs = dur ? dur * 1000 : durationMs ?? 0;

  return (
    <div
      className="flex flex-col"
      style={{ alignItems: isMine ? "flex-end" : "flex-start", marginTop: 8 }}
    >
      <div
        className="flex items-center gap-2.5"
        style={{
          padding: "9px 12px",
          minWidth: 210,
          maxWidth: 280,
          borderRadius: 22,
          background: isMine ? gradients.primaryButton : surfaces.glassSoft,
          border: `1px solid ${isMine ? "transparent" : surfaces.borderSoft}`,
          boxShadow: isMine ? shadows.primaryGlow : shadows.soft,
        }}
      >
        <button
          aria-label={playing ? "Pause voice message" : "Play voice message"}
          onClick={toggle}
          disabled={!src}
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{
            width: 34,
            height: 34,
            background: isMine ? "rgba(255,255,255,0.22)" : gradients.primaryButton,
            color: isMine ? "#fff" : "#fff",
            opacity: src ? 1 : 0.5,
          }}
        >
          {playing ? (
            <Pause style={{ width: 16, height: 16 }} />
          ) : (
            <Play style={{ width: 16, height: 16, marginLeft: 1 }} />
          )}
        </button>

        <div className="flex flex-1 flex-col gap-1" style={{ minWidth: 0 }}>
          <div
            onClick={seek}
            className="flex items-center"
            style={{ gap: 2, height: 26, cursor: src ? "pointer" : "default" }}
          >
            {bars.map((b, i) => {
              const on = i / BARS <= progress;
              return (
                <span
                  key={i}
                  style={{
                    flex: 1,
                    height: `${Math.round(b * 100)}%`,
                    minWidth: 2,
                    borderRadius: 2,
                    background: on ? fg : trackDim,
                    transition: "background 0.1s",
                  }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Mic style={{ width: 13, height: 13, color: isMine ? "rgba(255,255,255,0.8)" : colors.textMuted }} />
          <span
            style={{
              ...type.caption,
              fontSize: 11,
              color: isMine ? "rgba(255,255,255,0.9)" : colors.textMuted,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmt(playing ? progress * displayMs : displayMs)}
          </span>
        </div>
      </div>
      {src && <audio ref={audioRef} src={src} preload="metadata" />}
      <MetaRow mine={isMine} time={time} state={state} />
    </div>
  );
}

export function VoiceRecordingBar({
  durationMs,
  onCancel,
  onSend,
}: {
  durationMs: number;
  onCancel: () => void;
  onSend: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(20px)",
        borderTop: `1px solid ${surfaces.borderSoft}`,
        padding: `${spacing[2]}px ${spacing[3]}px calc(${spacing[3]}px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <button
        aria-label="Cancel recording"
        onClick={onCancel}
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{ width: 42, height: 42, color: colors.danger, background: "rgba(255,59,48,0.10)" }}
      >
        <Trash2 style={{ width: 20, height: 20 }} />
      </button>

      <div
        className="flex flex-1 items-center gap-2"
        style={{
          minHeight: 42,
          padding: "0 16px",
          borderRadius: radii.lg,
          background: "rgba(120,120,128,0.10)",
          border: `1px solid ${surfaces.borderSoft}`,
        }}
      >
        <span
          className="ds-rec-pulse rounded-full"
          style={{ width: 10, height: 10, background: colors.danger }}
        />
        <span style={{ ...type.bodyLg, fontSize: 15, color: colors.textPrimary, fontWeight: weights.medium, fontVariantNumeric: "tabular-nums" }}>
          {fmt(durationMs)}
        </span>
        <span style={{ ...type.caption, color: colors.textMuted, marginLeft: "auto" }}>Recording…</span>
      </div>

      <button
        aria-label="Send voice message"
        onClick={onSend}
        onPointerDown={() => haptic("messageSent")}
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{ width: 42, height: 42, background: gradients.primaryButton, boxShadow: shadows.primaryGlow, color: "#fff" }}
      >
        <ArrowUp style={{ width: 20, height: 20 }} strokeWidth={2.5} />
      </button>
    </div>
  );
}
