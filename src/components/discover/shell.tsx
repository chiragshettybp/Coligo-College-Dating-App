// ============================================================================
// DiscoverShell — shared page frame for the Discovery module. Provides the
// app background, a centered mobile column and the floating BottomNav wired to
// real routes. Tabs whose modules aren't built yet open a lightweight sheet
// instead of navigating nowhere.
// ============================================================================
import { useNavigate } from "@tanstack/react-router";
import { Heart, Flame, MessageCircle, UserRound } from "lucide-react";

import { APP_BACKGROUND, FONT_FAMILY, spacing } from "@/lib/ds";
import {
  BottomNav,
  type BottomNavItem,
} from "@/components/ds/navigation";

// "matches" is kept in the union so Match screens can still frame themselves
// in this shell, but it is no longer a bottom-nav tab.
export type DiscoverTab = "home" | "discover" | "matches" | "chat" | "profile";

const ORDER: DiscoverTab[] = ["home", "discover", "chat", "profile"];

export function DiscoverShell({
  children,
  active = "discover",
  chatBadge,
  maxWidth = 560,
}: {
  children: React.ReactNode;
  active?: DiscoverTab;
  chatBadge?: number;
  maxWidth?: number;
}) {
  const navigate = useNavigate();

  const navItems: BottomNavItem[] = [
    { icon: (p) => <Heart {...p} fill="currentColor" />, label: "Home" },
    { icon: (p) => <Flame {...p} />, label: "Discover" },
    { icon: (p) => <MessageCircle {...p} />, label: "Chat", badge: chatBadge || undefined },
    { icon: (p) => <UserRound {...p} />, label: "Profile" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: APP_BACKGROUND,
        backgroundAttachment: "fixed",
        fontFamily: FONT_FAMILY,
      }}
    >
      <main
        style={{
          maxWidth,
          margin: "0 auto",
          padding: `${spacing[4]}px ${spacing[4]}px ${spacing[9] + 64}px`,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </main>

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: `0 ${spacing[4]}px ${spacing[3]}px`,
          zIndex: 30,
          pointerEvents: "none",
        }}
      >
        <div style={{ maxWidth, margin: "0 auto", pointerEvents: "auto" }}>
          <BottomNav
            items={navItems}
            active={ORDER.indexOf(active)}
            onChange={(i) => {
              const tab = ORDER[i];
              if (tab === active) return;
              if (tab === "home") navigate({ to: "/home" });
              else if (tab === "discover") navigate({ to: "/discover" });
              else if (tab === "chat") navigate({ to: "/chat" });
              else navigate({ to: "/profile" });
            }}
          />
        </div>
      </div>
    </div>
  );
}
