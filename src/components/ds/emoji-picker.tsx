// ============================================================================
// EmojiPicker — a lightweight, dependency-free categorized emoji panel that
// matches the chat design language. Used by the composer (insert into text) and
// could be reused elsewhere. No external package: reliable across SSR + mobile.
// ============================================================================
import { useMemo, useState } from "react";

import { colors, radii, shadows, spacing, surfaces, type, weights } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

type Category = { id: string; label: string; icon: string; emojis: string[] };

const CATEGORIES: Category[] = [
  {
    id: "smileys",
    label: "Smileys",
    icon: "😀",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩",
      "😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🫢","🤫","🤔",
      "🫡","🤐","🤨","😐","😑","😶","🫥","😏","😒","🙄","😬","😮‍💨","🤥","😌","😔","😪",
      "🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎",
      "🤓","🧐","😕","🫤","😟","🙁","☹️","😮","😯","😲","😳","🥺","🥹","😦","😧","😨",
      "😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬",
    ],
  },
  {
    id: "gestures",
    label: "Gestures",
    icon: "👍",
    emojis: [
      "👍","👎","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","👇","☝️",
      "👋","🤚","🖐️","✋","🖖","🫲","🫱","🫳","🫴","👏","🙌","🫶","👐","🤲","🙏","✊",
      "👊","🤛","🤜","💪","🫵","💅","🤝","👀","🫦","👅","👄","🧠","🫀","💯","🔥","✨",
    ],
  },
  {
    id: "hearts",
    label: "Hearts",
    icon: "❤️",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","💕","💞","💓","💗",
      "💖","💘","💝","💟","♥️","💌","😻","😽","💋","🫂","👩‍❤️‍👨","💐","🌹","🌷","🌸","💫",
    ],
  },
  {
    id: "fun",
    label: "Fun",
    icon: "🎉",
    emojis: [
      "🎉","🎊","🥂","🍻","🍷","🍾","🎈","🎁","🎂","🍰","🧁","🍭","🍫","🍩","☕","🧋",
      "🍕","🍔","🍟","🌮","🍿","🎮","🎧","🎵","🎶","⚽","🏀","🎯","🎲","🏆","🚀","🌟",
      "⭐","🌈","☀️","🌙","⚡","💎","👑","🎓","📚","💻","📱","💡","🗺️","✈️","🏖️","🎬",
    ],
  },
];

export function EmojiPicker({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void;
  onClose?: () => void;
}) {
  const [active, setActive] = useState(CATEGORIES[0].id);
  const list = useMemo(
    () => CATEGORIES.find((c) => c.id === active) ?? CATEGORIES[0],
    [active],
  );

  return (
    <div
      role="dialog"
      aria-label="Emoji picker"
      style={{
        background: "rgba(255,255,255,0.98)",
        borderTop: `1px solid ${surfaces.borderSoft}`,
        boxShadow: shadows.medium,
      }}
    >
      <div
        className="flex items-center gap-1"
        style={{ padding: `${spacing[2]}px ${spacing[3]}px`, borderBottom: `1px solid ${surfaces.borderSoft}` }}
      >
        {CATEGORIES.map((c) => {
          const on = c.id === active;
          return (
            <button
              key={c.id}
              aria-label={c.label}
              onClick={() => setActive(c.id)}
              className="flex items-center justify-center rounded-full"
              style={{
                width: 38,
                height: 34,
                fontSize: 18,
                background: on ? surfaces.glassSoft : "transparent",
                border: `1px solid ${on ? surfaces.borderSoft : "transparent"}`,
                opacity: on ? 1 : 0.6,
              }}
            >
              {c.icon}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        {onClose && (
          <button
            aria-label="Close emoji picker"
            onClick={onClose}
            style={{ ...type.caption, color: colors.primary, fontWeight: weights.semibold, padding: "0 8px" }}
          >
            Done
          </button>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gap: 2,
          padding: spacing[2],
          maxHeight: 220,
          overflowY: "auto",
        }}
      >
        {list.emojis.map((e, i) => (
          <button
            key={`${e}-${i}`}
            aria-label={`Emoji ${e}`}
            onClick={() => {
              haptic("selection");
              onPick(e);
            }}
            className="flex items-center justify-center rounded-lg"
            style={{ height: 38, fontSize: 24, borderRadius: radii.sm }}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

// Quick reactions offered on message long-press.
export const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👍", "👏", "🎉"];
