import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useLayoutEffect, useCallback, useEffect, useMemo } from "react";
import {
  Heart,
  X,
  Star,
  Search,
  Bell,
  MessageCircle,
  User,
  Home,
  Settings,
  Check,
  AlertTriangle,
  Info,
  ShieldCheck,
  Sparkles,
  GraduationCap,
  MapPin,
  Plus,
  ImageOff,
  Flame,
  RotateCcw,
  Zap,
  ChevronLeft,
  Phone,
  Video,
  CheckCheck,
  Play,
  Mic,
  Camera,
  Smile,
  ArrowUp,
  WifiOff,
  Download,
  BellRing,
} from "lucide-react";

import {
  APP_BACKGROUND,
  FONT_FAMILY,
  colors,
  gradients,
  radii,
  shadows,
  spacing,
  surfaces,
  type,
  weights,
  motion,
  prefersReducedMotion,
} from "@/lib/ds";
import { haptic, type HapticToken } from "@/lib/haptics";
import {
  Avatar,
  Badge,
  Button,
  Chip,
  GlassPanel,
  IconButton,
  ProgressBar,
  Skeleton,
  TextField,
  Toggle,
} from "@/components/ds/glass";

import memoji1 from "@/assets/sample.png";
import memoji2 from "@/assets/sample.png";
import memoji3 from "@/assets/sample.png";
import memoji4 from "@/assets/sample.png";
import memoji5 from "@/assets/sample.png";
import ana from "@/assets/sample.png";

export const Route = createFileRoute("/ui")({
  head: () => ({
    meta: [
      { title: "Design System — College Dating App" },
      {
        name: "description",
        content:
          "The single source of truth: glassmorphic components, tokens, colors, typography, motion and interactions reused across every screen.",
      },
      { property: "og:title", content: "Design System — College Dating App" },
      {
        property: "og:description",
        content:
          "Live showcase of every reusable glassmorphic component powering the app.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: UIShowcase,
});

const avatars = [memoji1, memoji2, memoji3, memoji4, memoji5];

/* --------------------------------------------------------------- Layout bits */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: spacing[6] }}>
      <h2
        className="text-white"
        style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }}
      >
        {title}
      </h2>
      <p style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 1.45, marginTop: spacing[0] }}>
        {description}
      </p>
      <div style={{ marginTop: spacing[3] }}>{children}</div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center" style={{ gap: spacing[2] }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        color: colors.textMuted,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ Showcase */

function UIShowcase() {
  const [interests, setInterests] = useState<string[]>(["Music", "Coffee"]);
  const [notif, setNotif] = useState(true);
  const [dark, setDark] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [segment, setSegment] = useState(0);
  const [scrollTab, setScrollTab] = useState("For You");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [matchOpen, setMatchOpen] = useState(false);

  const toggleInterest = (i: string) =>
    setInterests((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));

  const dismissToast = (id: number) => setToasts((s) => s.filter((t) => t.id !== id));
  const pushToast = (tone: FeedbackTone, icon: React.ReactNode, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((s) => [...s, { id, tone, icon, message }].slice(-3));
    haptic(tone === "success" ? "softSuccess" : tone === "danger" ? "warning" : "selection");
    window.setTimeout(() => dismissToast(id), 3200);
  };


  return (
    <main
      className="min-h-screen w-full"
      style={{ fontFamily: FONT_FAMILY, background: APP_BACKGROUND }}
    >
      <div
        className="mx-auto w-full"
        style={{
          maxWidth: 480,
          paddingLeft: `max(${spacing[4]}px, env(safe-area-inset-left))`,
          paddingRight: `max(${spacing[4]}px, env(safe-area-inset-right))`,
          paddingTop: `calc(${spacing[7]}px + env(safe-area-inset-top))`,
          paddingBottom: `calc(${spacing[10]}px + env(safe-area-inset-bottom))`,
        }}
      >
        {/* Hero */}
        <header style={{ marginBottom: spacing[8] }}>
          <div className="flex items-center" style={{ gap: spacing[1], marginBottom: spacing[2] }}>
            <Badge tone="info">
              <Sparkles style={{ width: 12, height: 12 }} /> DESIGN FOUNDATION
            </Badge>
            <Badge tone="neutral">v1.0</Badge>
          </div>
          <h1
            style={{
              fontSize: "clamp(38px, 7vw, 64px)",
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              background: "linear-gradient(120deg,#ffffff 0%,#9dc4ff 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            The Design System
          </h1>
          <p
            style={{
              color: colors.textSecondary,
              fontSize: 18,
              lineHeight: 1.55,
              maxWidth: 620,
              marginTop: spacing[2],
            }}
          >
            The single source of truth for every screen. Auth, onboarding, swipe,
            matches, chat and profiles all assemble from these exact tokens and
            components — no visual drift, ever.
          </p>
        </header>

        {/* Colors */}
        <Section
          title="Colors"
          description="Semantic palette, gradients, glass surfaces and glow — pulled straight from the source card."
        >
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))" }}
          >
            {Object.entries(colors)
              .filter(([, v]) => v.startsWith("#"))
              .map(([name, value]) => (
                <Swatch key={name} name={name} value={value} />
              ))}
          </div>
          <div
            className="mt-3 grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))" }}
          >
            {Object.entries(gradients).map(([name, value]) => (
              <div key={name}>
                <div
                  style={{
                    height: 64,
                    borderRadius: radii.md,
                    background: value,
                    border: `1px solid ${surfaces.border}`,
                  }}
                />
                <Label>{name}</Label>
              </div>
            ))}
          </div>
        </Section>

        {/* Typography */}
        <Section
          title="Typography"
          description="SF Pro on Apple devices, Inter everywhere else. Tuned weights, line heights and optical tracking build the full hierarchy."
        >
          <GlassPanel style={{ padding: spacing[5] }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
              Display / 48
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, color: "#fff", marginTop: 12 }}>
              Heading 1 / 34
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", marginTop: 8 }}>
              Heading 2 / 26
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginTop: 8 }}>
              Title / 20
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, color: colors.textSecondary, marginTop: 8 }}>
              Body / 16 — the quick brown fox jumps over the lazy dog.
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: colors.textMuted, marginTop: 8 }}>
              Caption / 13 — supporting metadata and timestamps.
            </div>
            <div
              style={{
                fontSize: 40,
                fontWeight: 800,
                marginTop: 14,
                background: "linear-gradient(120deg,#57b0f6,#ea6fa6)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Gradient Text
            </div>
          </GlassPanel>
        </Section>

        {/* Buttons */}
        <Section
          title="Buttons"
          description="Every variant, size and state — glass fills, primary glow, hover lift and press."
        >
          <div className="space-y-4">
            <div>
              <Label>Variants</Label>
              <Row>
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="glass">Glass</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="success">Success</Button>
                <Button variant="danger">Danger</Button>
              </Row>
            </div>
            <div>
              <Label>Sizes</Label>
              <Row>
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </Row>
            </div>
            <div>
              <Label>States & extras</Label>
              <Row>
                <Button loading>Loading</Button>
                <Button disabled>Disabled</Button>
                <Button pill leftIcon={<Heart style={{ width: 18, height: 18 }} />}>
                  With icon
                </Button>
                <Button variant="glass" rightIcon={<Badge tone="danger">3</Badge>}>
                  Counter
                </Button>
              </Row>
            </div>
            <div>
              <Label>Icon & floating</Label>
              <Row>
                <IconButton>
                  <Search style={{ width: 22, height: 22 }} />
                </IconButton>
                <IconButton primary>
                  <Plus style={{ width: 22, height: 22 }} />
                </IconButton>
                <IconButton size={64} primary style={{ boxShadow: shadows.glow }}>
                  <Heart style={{ width: 28, height: 28 }} />
                </IconButton>
              </Row>
            </div>
            <Button fullWidth variant="primary" size="lg">
              Full Width CTA
            </Button>
          </div>
        </Section>

        {/* Inputs */}
        <Section
          title="Inputs"
          description="Glass fields with focus, error and helper states, plus search and OTP."
        >
          <GlassPanel style={{ padding: spacing[5] }}>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
              <TextField label="Full name" placeholder="Alex Rivera" />
              <TextField label="Password" type="password" placeholder="••••••••" />
              <TextField label="Email" placeholder="you@college.edu" defaultValue="wrong" error="Use your college email" />
              <div>
                <span className="mb-1.5 block" style={{ color: colors.textSecondary, fontSize: 14, fontWeight: 600 }}>
                  Search
                </span>
                <div
                  className="flex items-center gap-2"
                  style={{
                    borderRadius: radii.md,
                    padding: "12px 16px",
                    background: surfaces.glassSoft,
                    border: `1px solid ${surfaces.border}`,
                  }}
                >
                  <Search style={{ width: 18, height: 18, color: colors.textMuted }} />
                  <input
                    placeholder="Find people…"
                    className="w-full bg-transparent text-white outline-none placeholder:text-white/40"
                    style={{ fontSize: 15 }}
                  />
                </div>
              </div>
            </div>
            <div style={{ marginTop: spacing[4] }}>
              <Label>OTP</Label>
              <div className="flex gap-2">
                {["3", "9", "", ""].map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center text-white"
                    style={{
                      width: 52,
                      height: 60,
                      borderRadius: radii.md,
                      fontSize: 24,
                      fontWeight: 800,
                      background: surfaces.glassSoft,
                      border: `1px solid ${d ? colors.primary : surfaces.border}`,
                      boxShadow: d ? shadows.glow : "none",
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>
            </div>
          </GlassPanel>
        </Section>

        {/* Chips */}
        <Section
          title="Chips & Interests"
          description="Interest selectors with selected / unselected states used across onboarding and filters."
        >
          <Row>
            {["Music", "Coffee", "Gym", "Gaming", "Art", "Travel", "Movies", "Foodie"].map((i) => (
              <Chip key={i} selected={interests.includes(i)} onClick={() => toggleInterest(i)}>
                {i}
              </Chip>
            ))}
          </Row>
        </Section>

        {/* Avatars */}
        <Section
          title="Avatars"
          description="An identity system — premium depth, integrated status, verification, story rings, groups and placeholders."
        >
          <div className="space-y-5">
            {/* Sizes */}
            <div>
              <Label>Sizes</Label>
              <div className="mt-2 flex flex-wrap items-end" style={{ gap: spacing[3] }}>
                <Avatar src={ana} size="xs" />
                <Avatar src={memoji1} size="sm" />
                <Avatar src={memoji2} size="md" />
                <Avatar src={memoji3} size="lg" />
                <Avatar src={memoji4} size="xl" />
              </div>
            </div>

            {/* Status */}
            <div>
              <Label>Presence</Label>
              <div className="mt-2 flex flex-wrap items-center" style={{ gap: spacing[3] }}>
                <Avatar src={memoji1} size="lg" status="online" />
                <Avatar src={memoji2} size="lg" status="away" />
                <Avatar src={memoji3} size="lg" status="busy" />
                <Avatar src={memoji4} size="lg" status="offline" />
              </div>
            </div>

            {/* Verification + story rings */}
            <div>
              <Label>Verified & story rings</Label>
              <div className="mt-2 flex flex-wrap items-center" style={{ gap: spacing[3] }}>
                <Avatar src={ana} size="lg" verified />
                <Avatar src={memoji5} size="lg" verified status="online" />
                <Avatar src={memoji1} size="lg" ring />
                <Avatar src={memoji2} size="lg" ring status="online" />
              </div>
            </div>

            {/* Placeholders */}
            <div>
              <Label>Placeholders</Label>
              <div className="mt-2 flex flex-wrap items-center" style={{ gap: spacing[3] }}>
                <Avatar size="lg" initials="AR" />
                <Avatar size="lg" initials="MJ" />
                <Avatar size="lg" initials="?" />
              </div>
            </div>

            {/* Group stack */}
            <div>
              <Label>Group stack</Label>
              <div className="mt-2 flex">
                {avatars.map((src, i) => (
                  <div key={i} style={{ marginLeft: i === 0 ? 0 : -16, zIndex: avatars.length - i }}>
                    <Avatar src={src} size="md" />
                  </div>
                ))}
                <div
                  className="flex items-center justify-center rounded-full text-white"
                  style={{
                    marginLeft: -16,
                    width: 52,
                    height: 52,
                    fontSize: 14,
                    fontWeight: 700,
                    background: surfaces.glassSoft,
                    boxShadow:
                      "inset 0 0 0 1px rgba(255,255,255,0.16), 0 8px 20px rgba(0,0,0,0.4)",
                  }}
                >
                  +9
                </div>
              </div>
            </div>

            {/* Profile header + match pair */}
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
              <GlassPanel style={{ padding: spacing[5], textAlign: "center" }}>
                <Label>Profile header</Label>
                <div className="mt-3 flex justify-center">
                  <Avatar src={ana} size="hero" ring verified />
                </div>
                <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, marginTop: spacing[3], letterSpacing: "-0.02em" }}>
                  Maya Chen
                </div>
                <div style={{ color: colors.textSecondary, fontSize: 13, fontWeight: 500, marginTop: 2 }}>
                  Design · Class of '27
                </div>
              </GlassPanel>
              <GlassPanel glow style={{ padding: spacing[5], textAlign: "center" }}>
                <Label>Match pair</Label>
                <div className="mt-3 flex justify-center">
                  <div style={{ marginRight: -18, zIndex: 2 }}>
                    <Avatar src={ana} size="xl" ring />
                  </div>
                  <Avatar src={memoji2} size="xl" ring />
                </div>
                <div style={{ color: "#fff", fontSize: 16, fontWeight: 700, marginTop: spacing[3] }}>
                  You & Maya
                </div>
              </GlassPanel>
            </div>
          </div>
        </Section>

        {/* Cards */}
        <Section
          title="Cards"
          description="Glass, profile, swipe and match cards — the building blocks of every feed."
        >
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
            {/* Swipe card */}
            <SwipeCard />
            {/* Match card */}
            <GlassPanel glow style={{ padding: spacing[5], textAlign: "center" }}>
              <div className="flex justify-center" style={{ marginBottom: 12 }}>
                <div style={{ marginRight: -18 }}>
                  <Avatar src={ana} size="xl" ring />
                </div>
                <Avatar src={memoji2} size="xl" ring />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>It's a Match! 🎉</div>
              <p style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>
                You and Maya liked each other
              </p>
              <div className="mt-4">
                <Button fullWidth variant="primary" leftIcon={<MessageCircle style={{ width: 18, height: 18 }} />}>
                  Say hi
                </Button>
              </div>
            </GlassPanel>
            {/* Stat card */}
            <GlassPanel style={{ padding: spacing[5] }}>
              <Label>Profile completion</Label>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#fff", margin: "6px 0 12px" }}>78%</div>
              <ProgressBar value={78} />
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="success"><Check style={{ width: 12, height: 12 }} /> Verified</Badge>
                <Badge tone="warning">Add photos</Badge>
                <Badge tone="primary">Add bio</Badge>
              </div>
            </GlassPanel>
          </div>
        </Section>

        <Section
          title="Shared element transitions"
          description="Continuity, not page swaps. Tap a photo — the same element physically expands from its exact position into the viewer with a spring, then reverses on dismiss. The building block for swipe→profile, profile→chat and gallery flows."
        >
          <SharedGallery images={avatars} />
        </Section>



        {/* Swipe system */}
        <Section
          title="Swipe System"
          description="The flagship interaction — a stacked, depth-layered deck, tactile gesture controls and premium overlays."
        >
          {/* Stacked deck */}
          <SwipeDeck />

          {/* Controls */}
          <div style={{ marginTop: spacing[5] }}>
            <Label>Gesture controls</Label>
            <div
              className="flex items-end justify-center"
              style={{ gap: spacing[3], marginTop: spacing[2] }}
            >
              <SwipeControl label="Undo" size={46} tint={colors.warning} hapticToken="confirm">
                <RotateCcw style={{ width: 20, height: 20 }} strokeWidth={2.4} />
              </SwipeControl>
              <SwipeControl label="Nope" size={58} tint={colors.danger} hapticToken="swipeSnap">
                <X style={{ width: 26, height: 26 }} strokeWidth={2.8} />
              </SwipeControl>
              <SwipeControl label="Super" size={52} tint={colors.info} hapticToken="heavy">
                <Star style={{ width: 22, height: 22 }} fill="currentColor" />
              </SwipeControl>
              <SwipeControl label="Like" size={68} tint={colors.success} primary hapticToken="softSuccess">
                <Heart style={{ width: 30, height: 30 }} fill="#fff" />
              </SwipeControl>
              <SwipeControl label="Boost" size={52} tint={colors.accent} hapticToken="medium">
                <Zap style={{ width: 22, height: 22 }} fill="currentColor" />
              </SwipeControl>

            </div>
          </div>

          {/* Overlays */}
          <div style={{ marginTop: spacing[5] }}>
            <Label>Swipe overlays</Label>
            <div className="flex flex-wrap items-center" style={{ gap: spacing[3], marginTop: spacing[2] }}>
              <Stamp label="LIKE" color={colors.success} rotate={-10} />
              <Stamp label="NOPE" color={colors.danger} rotate={10} />
              <Stamp label="SUPER" color={colors.info} rotate={-6} />
              <Stamp label="BOOST" color={colors.accent} rotate={6} />
            </div>
          </div>

          {/* Loading skeleton */}
          <div style={{ marginTop: spacing[5] }}>
            <Label>Loading deck</Label>
            <div style={{ marginTop: spacing[2] }}>
              <GlassPanel style={{ padding: 0, overflow: "hidden" }}>
                <Skeleton style={{ height: 300, borderRadius: 0 }} />
                <div style={{ padding: spacing[4] }}>
                  <Skeleton style={{ height: 20, width: "55%" }} />
                  <Skeleton style={{ height: 13, width: "38%", marginTop: spacing[2] }} />
                  <div className="flex" style={{ gap: spacing[1], marginTop: spacing[3] }}>
                    <Skeleton style={{ height: 28, width: 70, borderRadius: radii.pill }} />
                    <Skeleton style={{ height: 28, width: 84, borderRadius: radii.pill }} />
                    <Skeleton style={{ height: 28, width: 60, borderRadius: radii.pill }} />
                  </div>
                </div>
              </GlassPanel>
            </div>
          </div>
        </Section>

        {/* Badges */}
        <Section
          title="Badges"
          description="Identity, status and metadata tokens — one glass recipe, color-independent cues, elegant enough to feel collectible."
        >
          <Label>Status</Label>
          <Row>
            <Badge tone="success" dot pulse>Online</Badge>
            <Badge tone="warning" dot>Away</Badge>
            <Badge tone="neutral" dot>Offline</Badge>
            <Badge tone="info" dot pulse>Typing…</Badge>
          </Row>
          <div style={{ height: spacing[3] }} />
          <Label>Identity</Label>
          <Row>
            <Badge tone="success"><ShieldCheck style={{ width: 12, height: 12 }} /> Verified</Badge>
            <Badge tone="primary"><Sparkles style={{ width: 12, height: 12 }} /> Premium</Badge>
            <Badge tone="info">New</Badge>
            <Badge tone="warning"><Flame style={{ width: 12, height: 12 }} /> Trending</Badge>
            <Badge tone="neutral"><GraduationCap style={{ width: 12, height: 12 }} /> CS · Year 2</Badge>
          </Row>
          <div style={{ height: spacing[3] }} />
          <Label>Match</Label>
          <Row>
            <Badge tone="success"><Heart style={{ width: 12, height: 12 }} fill="currentColor" /> 96% match</Badge>
            <Badge tone="primary"><MapPin style={{ width: 12, height: 12 }} /> Same campus</Badge>
            <Badge tone="info"><Sparkles style={{ width: 12, height: 12 }} /> 3 shared interests</Badge>
            <Badge tone="neutral" dot>Active recently</Badge>
          </Row>
        </Section>

        {/* Feedback: alerts, toasts, banners */}
        <Section
          title="Alerts, Toasts & Banners"
          description="A calm feedback language — glass surfaces, restrained accents, tone-tinted icons and one motion system. Every surface says what happened and what to do next at a glance."
        >
          <Label>Inline banners</Label>
          <div className="space-y-2">
            <Banner tone="danger" icon={<WifiOff style={{ width: 16, height: 16 }} />} title="You're offline" action={{ label: "Retry" }} />
            <Banner tone="info" icon={<Download style={{ width: 16, height: 16 }} />} title="Update available" action={{ label: "Install" }} />
            <Banner tone="warning" icon={<BellRing style={{ width: 16, height: 16 }} />} title="Enable notifications to never miss a match" action={{ label: "Allow" }} />
          </div>

          <div style={{ height: spacing[4] }} />
          <Label>Alert cards</Label>
          <div className="space-y-3">
            <Alert
              tone="success"
              icon={<Check style={{ width: 18, height: 18 }} />}
              title="Profile saved"
              body="Your changes are live and visible to matches."
            />
            <Alert
              tone="warning"
              icon={<AlertTriangle style={{ width: 18, height: 18 }} />}
              title="Add more photos"
              body="Profiles with 4+ photos get 3× more matches."
              primaryAction={{ label: "Add photos" }}
              secondaryAction={{ label: "Later" }}
            />
            <Alert
              tone="danger"
              icon={<X style={{ width: 18, height: 18 }} />}
              title="Couldn't send message"
              body="Check your connection and try again."
              primaryAction={{ label: "Retry" }}
              onDismiss={() => {}}
            />
            <Alert
              tone="info"
              icon={<Info style={{ width: 18, height: 18 }} />}
              title="New feature"
              body="You can now filter matches by department."
              onDismiss={() => {}}
            />
          </div>

          <div style={{ height: spacing[4] }} />
          <Label>Floating toasts</Label>
          <Row>
            <Button size="sm" variant="secondary" onClick={() => pushToast("success", <Check style={{ width: 15, height: 15 }} />, "Profile saved")}>Success</Button>
            <Button size="sm" variant="secondary" onClick={() => pushToast("info", <Info style={{ width: 15, height: 15 }} />, "Filter applied")}>Info</Button>
            <Button size="sm" variant="secondary" onClick={() => pushToast("warning", <AlertTriangle style={{ width: 15, height: 15 }} />, "Photo upload slow")}>Warning</Button>
            <Button size="sm" variant="secondary" onClick={() => pushToast("danger", <WifiOff style={{ width: 15, height: 15 }} />, "Network error")}>Error</Button>
          </Row>
        </Section>


        {/* Chat */}
        <Section
          title="Chat"
          description="A native messaging surface — grouped bubbles, receipts, reactions, voice, media and composer."
        >
          <GlassPanel style={{ padding: 0, overflow: "hidden" }}>
            <ChatHeader />
            <div
              className="flex flex-col"
              style={{ padding: `${spacing[4]}px ${spacing[4]}px ${spacing[3]}px`, gap: 2 }}
            >
              <DayDivider label="Today" />

              <Bubble mine={false} entrance groupPos="single" tail>
                Hey! Saw we're both in CS 👋
              </Bubble>

              <Bubble mine entrance groupPos="first">
                No way, what year are you?
              </Bubble>
              <Bubble mine entrance groupPos="last" tail state="read" time="9:41">
                We should study together sometime
              </Bubble>

              <Bubble
                mine={false}
                entrance
                groupPos="single"
                reactions={["❤️", "🔥"]}
              >
                Second year. Coffee this week? ☕️
              </Bubble>

              <VoiceMessage mine={false} />

              <ImageMessage mine time="9:44" state="delivered" />

              <TypingBubble />
            </div>
            <Composer />
          </GlassPanel>
        </Section>


        {/* Toggles & settings */}
        <Section title="Settings Controls" description="Toggles and switches for preferences.">
          <GlassPanel style={{ padding: spacing[5] }}>
            <SettingRow label="Push notifications" checked={notif} onChange={setNotif} />
            <div style={{ height: 1, background: surfaces.borderSoft, margin: "14px 0" }} />
            <SettingRow label="Dark mode" checked={dark} onChange={setDark} />
          </GlassPanel>
        </Section>

        {/* Loaders */}
        <Section title="Loaders & Skeletons" description="Shimmer placeholders for loading states.">
          <GlassPanel style={{ padding: spacing[5] }}>
            <div className="flex items-center gap-3">
              <Skeleton style={{ width: 52, height: 52, borderRadius: 999 }} />
              <div className="flex-1 space-y-2">
                <Skeleton style={{ height: 14, width: "40%" }} />
                <Skeleton style={{ height: 12, width: "70%" }} />
              </div>
            </div>
            <Skeleton style={{ height: 160, marginTop: 16 }} />
          </GlassPanel>
        </Section>

        {/* Empty state */}
        <Section title="Empty States" description="Friendly zero-data screens.">
          <GlassPanel style={{ padding: spacing[7], textAlign: "center" }}>
            <div
              className="ds-float mx-auto flex items-center justify-center rounded-full"
              style={{
                width: 88,
                height: 88,
                background: surfaces.glassSoft,
                border: `1px solid ${surfaces.border}`,
              }}
            >
              <ImageOff style={{ width: 38, height: 38, color: colors.textMuted }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginTop: 16 }}>
              No matches yet
            </div>
            <p style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>
              Keep swiping — your people are out there.
            </p>
            <div className="mt-4 flex justify-center">
              <Button variant="primary" leftIcon={<Flame style={{ width: 18, height: 18 }} />}>
                Start swiping
              </Button>
            </div>
          </GlassPanel>
        </Section>

        {/* Navigation */}
        <Section
          title="Navigation"
          description="A complete navigation system — large title, glass top bar, segmented + scrollable tabs, floating tab bar and FAB."
        >
          <div className="space-y-4">
            {/* Large-title top bar */}
            <GlassPanel style={{ padding: `${spacing[3]}px ${spacing[4]}px ${spacing[4]}px` }}>
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div style={{ ...type.caption, color: colors.primary }}>Sunday, July 12</div>
                  <h3 style={{ ...type.displaySm, color: "#fff", marginTop: 2 }}>Discover</h3>
                </div>
                <div className="flex shrink-0 items-center" style={{ gap: spacing[1] }}>
                  <NavAction label="Search"><Search style={{ width: 19, height: 19 }} /></NavAction>
                  <NavAction label="Notifications" badge={3}>
                    <Bell style={{ width: 19, height: 19 }} />
                  </NavAction>
                  <button aria-label="Profile" className="rounded-full" style={{ marginLeft: 2 }}>
                    <Avatar src={ana} size="sm" status="online" />
                  </button>
                </div>
              </div>
            </GlassPanel>

            {/* Compact glass top bar with back + centered title */}
            <GlassPanel style={{ padding: `${spacing[2]}px ${spacing[3]}px` }}>
              <div className="flex items-center justify-between">
                <NavAction label="Back"><ChevronLeft style={{ width: 22, height: 22 }} /></NavAction>
                <span style={{ ...type.titleMd, color: "#fff" }}>Profile</span>
                <NavAction label="More"><Plus style={{ width: 20, height: 20 }} /></NavAction>
              </div>
            </GlassPanel>

            {/* Segmented control */}
            <Segmented
              options={["Nearby", "Popular", "New"]}
              value={segment}
              onChange={setSegment}
            />

            {/* Scrollable tabs */}
            <ScrollTabs
              options={["For You", "Trending", "Music", "Sports", "Art", "Travel", "Food"]}
              value={scrollTab}
              onChange={setScrollTab}
            />

            {/* Floating bottom tab bar */}
            <div style={{ position: "relative", paddingTop: spacing[2] }}>
              <FloatingTabBar active={activeTab} onChange={setActiveTab} />
            </div>
          </div>
        </Section>

        <Section
          title="Match Celebration"
          description="The emotional climax — two people connect. Avatars travel into a shared warm glow, details reveal progressively, and a soft chime + success haptic land on the peak. Reduced-motion friendly."
        >
          <GlassPanel style={{ padding: spacing[5] }}>
            <div className="flex flex-col items-center text-center" style={{ gap: spacing[3] }}>
              <div className="flex items-center">
                <Avatar src={ana} size="lg" />
                <div style={{ marginLeft: -18 }}>
                  <Avatar src={memoji5} size="lg" />
                </div>
              </div>
              <p style={{ ...type.bodyMd, color: colors.textSecondary, maxWidth: 320 }}>
                Preview the signature moment users feel after a mutual like.
              </p>
              <Button
                variant="primary"
                pill
                leftIcon={<Sparkles style={{ width: 18, height: 18 }} />}
                onClick={() => setMatchOpen(true)}
              >
                Trigger “It’s a Match”
              </Button>
            </div>
          </GlassPanel>
        </Section>

        <MatchCelebration
          open={matchOpen}
          left={{ src: ana, name: "Ana" }}
          right={{ src: memoji5, name: "Jordan" }}
          shared={{
            college: "Stanford University",
            gradYear: "Class of ’26",
            interests: ["Music", "Coffee", "Hiking"],
            clubs: "Design Collective",
            compatibility: 94,
          }}
          onClose={() => setMatchOpen(false)}
          onMessage={() => {
            setMatchOpen(false);
            pushToast("success", <MessageCircle style={{ width: 16, height: 16 }} />, "Opening chat with Jordan…");
          }}
        />




        <footer
          className="flex items-center gap-2"
          style={{ color: colors.textMuted, fontSize: 13, marginTop: spacing[8] }}
        >
          <Settings style={{ width: 14, height: 14 }} />
          One system, every screen. Import from{" "}
          <code style={{ color: colors.info }}>@/components/ds/glass</code>.
        </footer>
      </div>
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </main>

  );
}

/* -------------------------------------------------------------- Local pieces */

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div>
      <div
        style={{
          height: 64,
          borderRadius: radii.md,
          background: value,
          border: `1px solid ${surfaces.border}`,
        }}
      />
      <div style={{ marginTop: 6 }}>
        <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>
          {name}
        </div>
        <div style={{ color: colors.textMuted, fontSize: 11 }}>{value}</div>
      </div>
    </div>
  );
}

function MiniTag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 backdrop-blur-md"
      style={{
        borderRadius: radii.pill,
        padding: "5px 11px",
        fontSize: 12,
        fontWeight: 600,
        color: "#fff",
        background: "rgba(255,255,255,0.14)",
        border: `1px solid ${surfaces.border}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)",
      }}
    >
      {children}
    </span>
  );
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
        color: "#fff",
        background: "rgba(6,10,24,0.42)",
        border: `1px solid ${surfaces.border}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
      }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Shared-element transition system (FLIP)
// ---------------------------------------------------------------------------
// The core of a continuity system: an element physically transforms from its
// origin rect into its destination rect instead of one screen fading out and
// another fading in. Same image, same identity — it just moves. Spring on the
// way in, ease-out on the way back, radius + shadow morph preserved throughout.
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function SharedGallery({ images }: { images: string[] }) {
  const [active, setActive] = useState<number | null>(null);
  const originRef = useRef<DOMRect | null>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  const open = (i: number) => {
    const el = thumbRefs.current[i];
    if (el) originRef.current = el.getBoundingClientRect();
    haptic("light");
    setActive(i);
  };

  // FLIP: measure the destination, invert to the origin rect, then play forward.
  useLayoutEffect(() => {
    if (active === null) return;
    const img = imgRef.current;
    const rect = originRef.current;
    if (!img || !rect) return;
    const dest = img.getBoundingClientRect();
    const dx = rect.left - dest.left;
    const dy = rect.top - dest.top;
    const sx = rect.width / dest.width;
    const sy = rect.height / dest.height;
    img.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, borderRadius: "20px" },
        { transform: "translate(0,0) scale(1,1)", borderRadius: `${radii.lg}px` },
      ],
      { duration: 440, easing: SPRING, fill: "both" },
    );
    backdropRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 320,
      easing: EASE,
      fill: "both",
    });
  }, [active]);

  const close = useCallback(() => {
    haptic("light");
    const img = imgRef.current;
    const rect = originRef.current;
    if (!img || !rect) return setActive(null);
    const dest = img.getBoundingClientRect();
    const dx = rect.left - dest.left;
    const dy = rect.top - dest.top;
    const sx = rect.width / dest.width;
    const sy = rect.height / dest.height;
    const anim = img.animate(
      [
        { transform: "translate(0,0) scale(1,1)", borderRadius: `${radii.lg}px` },
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, borderRadius: "20px" },
      ],
      { duration: 340, easing: EASE, fill: "both" },
    );
    backdropRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 300,
      easing: EASE,
      fill: "both",
    });
    anim.onfinish = () => setActive(null);
  }, []);

  return (
    <>
      <div className="flex gap-3">
        {images.map((src, i) => (
          <button
            key={i}
            ref={(el) => {
              thumbRefs.current[i] = el;
            }}
            onClick={() => open(i)}
            className="ds-press overflow-hidden"
            aria-label={`Open photo ${i + 1}`}
            style={{
              width: 84,
              height: 84,
              borderRadius: 20,
              border: `1px solid ${surfaces.border}`,
              boxShadow: shadows.soft,
              opacity: active === i ? 0 : 1,
              transition: "opacity 0.2s ease",
            }}
          >
            <img src={src} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {active !== null && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 60, padding: spacing[5] }}
          role="dialog"
          aria-modal="true"
        >
          <div
            ref={backdropRef}
            onClick={close}
            className="absolute inset-0 backdrop-blur-xl"
            style={{ background: "rgba(4,8,20,0.82)" }}
          />
          <img
            ref={imgRef}
            src={images[active]}
            alt="Expanded photo"
            onClick={close}
            className="relative object-cover"
            style={{
              width: "min(88vw, 420px)",
              height: "min(70vh, 520px)",
              borderRadius: radii.lg,
              transformOrigin: "top left",
              boxShadow: shadows.large,
              border: `1px solid ${surfaces.border}`,
            }}
          />
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Match Celebration — the emotional climax
// ---------------------------------------------------------------------------
// Not a popup: a cinematic moment. Two avatars travel into a shared warm glow,
// details reveal progressively, tiny light particles drift, and a soft chime +
// success haptic land on the peak. Everything reuses the global motion tokens
// and fully respects Reduce Motion (movement collapses, feedback preserved).

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
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    // Gentle rising two-note perfect fifth (A4 -> E5), soft sine bloom.
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
    master.gain.setValueAtTime(0.9, now);
    setTimeout(() => ctx.close().catch(() => {}), 1600);
  } catch {
    /* audio unavailable — visuals + haptics still carry the moment */
  }
}

type MatchProfile = { src: string; name: string };
type MatchShared = {
  college: string;
  gradYear: string;
  interests: string[];
  clubs: string;
  compatibility: number;
};

function MatchCelebration({
  open,
  left,
  right,
  shared,
  onClose,
  onMessage,
}: {
  open: boolean;
  left: MatchProfile;
  right: MatchProfile;
  shared: MatchShared;
  onClose: () => void;
  onMessage: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);

  // Low-count, low-opacity ambient light particles — never confetti.
  const particles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        left: 8 + Math.random() * 84,
        size: 3 + Math.random() * 4,
        opacity: 0.18 + Math.random() * 0.3,
        delay: Math.random() * 4,
        dur: 5 + Math.random() * 4,
      })),
    [],
  );

  useLayoutEffect(() => {
    if (!open) {
      setRevealed(false);
      return;
    }
    const reduce = prefersReducedMotion();

    // Backdrop + light settle in first.
    rootRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: reduce ? 0 : 380,
      easing: EASE,
      fill: "both",
    });

    if (!reduce) {
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

    // Peak: progressive reveal + warm haptic + soft chime.
    const peak = window.setTimeout(
      () => {
        setRevealed(true);
        haptic("strongSuccess");
        playMatchChime();
      },
      reduce ? 0 : 540,
    );
    return () => window.clearTimeout(peak);
  }, [open]);

  // Escape to dismiss.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const reduce = prefersReducedMotion();
  const reveal = (i: number): React.CSSProperties => ({
    opacity: revealed ? 1 : 0,
    transform: revealed ? "translateY(0)" : "translateY(12px)",
    transition: reduce
      ? "none"
      : `opacity 0.5s ${EASE} ${0.04 + i * 0.09}s, transform 0.62s ${SPRING} ${0.04 + i * 0.09}s`,
  });

  const indicators = [
    { icon: <GraduationCap style={{ width: 15, height: 15 }} />, label: shared.college },
    { icon: <Star style={{ width: 15, height: 15 }} />, label: shared.gradYear },
    { icon: <Sparkles style={{ width: 15, height: 15 }} />, label: `${shared.interests.length} shared interests` },
    { icon: <Flame style={{ width: 15, height: 15 }} />, label: shared.clubs },
    { icon: <Heart style={{ width: 15, height: 15 }} />, label: `${shared.compatibility}% compatibility` },
  ];

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`It's a match with ${right.name}`}
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 80, padding: spacing[5] }}
    >
      {/* Backdrop — dark navy depth + gentle radial light, softly blurred. */}
      <div
        onClick={onClose}
        className="absolute inset-0 backdrop-blur-2xl"
        style={{
          background:
            "radial-gradient(70% 50% at 50% 34%, rgba(90,140,255,0.16) 0%, rgba(10,16,38,0) 60%)," +
            "radial-gradient(120% 90% at 50% 120%, rgba(46,70,200,0.12) 0%, rgba(6,10,24,0) 62%)," +
            "linear-gradient(180deg, rgba(4,7,16,0.86) 0%, rgba(6,9,22,0.92) 100%)",
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
                top: `${40 + Math.random() * 24}%`,
                width: p.size,
                height: p.size,
                background: "rgba(255,255,255,0.9)",
                boxShadow: "0 0 8px rgba(255,255,255,0.6)",
                "--p-opacity": p.opacity,
                "--p-delay": `${p.delay}s`,
                "--p-dur": `${p.dur}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative flex w-full flex-col items-center text-center" style={{ maxWidth: 380 }}>
        {/* Avatars converging into a shared warm glow. */}
        <div className="relative flex items-center justify-center" style={{ height: 168, marginBottom: spacing[5] }}>
          <div
            className="ds-match-halo absolute rounded-full"
            style={{
              width: 240,
              height: 240,
              background:
                "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.12) 34%, rgba(255,255,255,0) 68%)",
              filter: "blur(8px)",
              pointerEvents: "none",
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
        </div>

        {/* Overline + title. */}
        <div style={reveal(0)}>
          <span style={{ ...type.overline, color: colors.primary }}>You connected</span>
        </div>
        <h2
          style={{
            ...reveal(1),
            fontSize: "clamp(38px, 10vw, 52px)",
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            marginTop: 6,
            background: "linear-gradient(120deg,#ffffff 0%,#bcd4ff 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          It’s a match
        </h2>
        <p style={{ ...reveal(2), ...type.bodyLg, color: colors.textSecondary, marginTop: 8 }}>
          You and <span style={{ color: "#fff", fontWeight: 600 }}>{right.name}</span> liked each other
        </p>

        {/* Connection indicators — reveal progressively, never all at once. */}
        <div
          className="flex flex-wrap items-center justify-center"
          style={{ gap: spacing[1], marginTop: spacing[4] }}
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

        {/* Buttons emerge with a small spring lift. */}
        <div className="w-full" style={{ marginTop: spacing[6] }}>
          <div style={reveal(3 + indicators.length)}>
            <Button
              variant="primary"
              size="lg"
              pill
              fullWidth
              leftIcon={<MessageCircle style={{ width: 20, height: 20 }} />}
              onClick={onMessage}
            >
              Send Message
            </Button>
          </div>
          <div style={{ ...reveal(4 + indicators.length), marginTop: spacing[2] }}>
            <Button variant="glass" size="lg" pill fullWidth onClick={onClose}>
              Keep Swiping
            </Button>
          </div>
        </div>
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
          background: "rgba(6,10,24,0.5)",
          border: `1px solid ${surfaces.border}`,
          color: "#fff",
        }}
      >
        <X style={{ width: 20, height: 20 }} />
      </button>
    </div>
  );
}






function SwipeCard({ overlay }: { overlay?: "LIKE" | "NOPE" | "SUPER" | "BOOST" }) {
  const overlayColor =
    overlay === "NOPE"
      ? colors.danger
      : overlay === "SUPER"
        ? colors.info
        : overlay === "BOOST"
          ? colors.accent
          : colors.success;

  return (
    <GlassPanel style={{ padding: 0, overflow: "hidden", boxShadow: shadows.large }}>
      <div style={{ position: "relative", height: 440 }}>
        <img src={memoji5} alt="Jordan's profile" className="h-full w-full object-cover" />

        {/* page indicator */}
        <div
          className="absolute flex gap-1.5"
          style={{ top: spacing[2], left: spacing[3], right: spacing[3] }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: radii.pill,
                background: i === 0 ? "#fff" : "rgba(255,255,255,0.32)",
                boxShadow: i === 0 ? "0 0 8px rgba(255,255,255,0.6)" : "none",
              }}
            />
          ))}
        </div>

        {/* top status row */}
        <div
          className="absolute flex items-center justify-between"
          style={{ top: spacing[4], left: spacing[3], right: spacing[3] }}
        >
          <GlassPill>
            <MapPin style={{ width: 12, height: 12 }} /> 2 km
          </GlassPill>
          <GlassPill>
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
          </GlassPill>
        </div>

        {/* overlay stamp */}
        {overlay && (
          <div
            className="absolute"
            style={{ top: spacing[6], left: spacing[4], transform: "rotate(-12deg)" }}
          >
            <Stamp label={overlay} color={overlayColor} rotate={0} />
          </div>
        )}

        {/* adaptive fade + vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(120% 80% at 50% 0%, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 45%)," +
              "linear-gradient(180deg, transparent 42%, rgba(3,6,14,0.55) 72%, rgba(3,6,14,0.94) 100%)",
          }}
        />

        {/* info */}
        <div
          className="absolute"
          style={{ left: spacing[4], right: spacing[4], bottom: spacing[4] }}
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
              Jordan, 20
            </span>
            <Badge tone="success">
              <ShieldCheck style={{ width: 12, height: 12 }} />
            </Badge>
            <span style={{ marginLeft: "auto" }}>
              <span
                className="inline-flex items-center gap-1"
                style={{
                  borderRadius: radii.pill,
                  padding: "3px 9px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.9)",
                  background: "rgba(255,255,255,0.14)",
                }}
              >
                <Sparkles style={{ width: 11, height: 11 }} /> 92%
              </span>
            </span>
          </div>
          <div
            className="mt-1 flex items-center gap-1.5"
            style={{ color: colors.textSecondary, fontSize: 13, fontWeight: 500 }}
          >
            <GraduationCap style={{ width: 14, height: 14 }} /> Design · Class of '27
          </div>
          <p
            style={{
              color: "rgba(255,255,255,0.82)",
              fontSize: 13,
              lineHeight: 1.4,
              marginTop: spacing[1],
            }}
          >
            Sketching by day, playlists by night. Looking for a museum-and-coffee person.
          </p>
          <div className="mt-3 flex flex-wrap" style={{ gap: spacing[1] }}>
            <MiniTag>☕ Coffee</MiniTag>
            <MiniTag>🎧 Indie</MiniTag>
            <MiniTag>🎨 Design</MiniTag>
          </div>
        </div>
      </div>

      {/* on-card controls */}
      <div className="flex items-center justify-center" style={{ gap: spacing[3], padding: spacing[3] }}>
        <SwipeControl size={46} tint={colors.danger}>
          <X style={{ width: 22, height: 22 }} strokeWidth={2.8} />
        </SwipeControl>
        <SwipeControl size={52} tint={colors.info}>
          <Star style={{ width: 22, height: 22 }} fill="currentColor" />
        </SwipeControl>
        <SwipeControl size={58} tint={colors.success} primary>
          <Heart style={{ width: 26, height: 26 }} fill="#fff" />
        </SwipeControl>
      </div>
    </GlassPanel>
  );
}

function SwipeDeck() {
  return (
    <div style={{ position: "relative" }}>
      {/* third card */}
      <div
        className="absolute inset-0"
        style={{ transform: "translateY(22px) scale(0.9)", opacity: 0.35 }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: radii.lg,
            background: surfaces.glass,
            border: `1px solid ${surfaces.borderSoft}`,
            boxShadow: shadows.medium,
          }}
        />
      </div>
      {/* second card */}
      <div
        className="absolute inset-0"
        style={{ transform: "translateY(11px) scale(0.95)", opacity: 0.6 }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: radii.lg,
            background: surfaces.glass,
            border: `1px solid ${surfaces.border}`,
            boxShadow: shadows.medium,
          }}
        />
      </div>
      {/* top card */}
      <div style={{ position: "relative", transform: "rotate(-1.5deg)" }}>
        <SwipeCard overlay="LIKE" />
      </div>
    </div>
  );
}

function SwipeControl({
  children,
  label,
  size = 52,
  tint,
  primary = false,
  hapticToken,
}: {
  children: React.ReactNode;
  label?: string;
  size?: number;
  tint: string;
  primary?: boolean;
  hapticToken?: HapticToken;
}) {
  // Layered depth: ceramic surface, soft inner highlight, hairline border,
  // soft ambient + contact shadow, tiny directional specular highlight.
  const surface = primary
    ? `radial-gradient(115% 115% at 50% 8%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0) 68%), linear-gradient(180deg, ${tint} 0%, ${tint}d0 100%)`
    : `radial-gradient(120% 120% at 50% 12%, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 42%, rgba(255,255,255,0) 72%), linear-gradient(180deg, #20242f 0%, #14161e 100%)`;

  const shadow = primary
    ? [
        "0 1px 1px rgba(0,0,0,0.35)",
        "0 10px 26px rgba(0,0,0,0.34)",
        `0 6px 20px ${tint}3a`,
        "inset 0 1px 1px rgba(255,255,255,0.35)",
        "inset 0 -2px 4px rgba(0,0,0,0.22)",
      ].join(", ")
    : [
        "0 1px 2px rgba(0,0,0,0.4)",
        "0 9px 22px rgba(0,0,0,0.32)",
        "0 2px 5px rgba(0,0,0,0.28)",
        "inset 0 1px 1px rgba(255,255,255,0.1)",
        "inset 0 -2px 4px rgba(0,0,0,0.4)",
      ].join(", ");

  return (
    <div className="flex flex-col items-center" style={{ gap: spacing[2] }}>
      <button
        aria-label={label}
        onPointerDown={() => haptic(hapticToken ?? (primary ? "softSuccess" : "selection"))}
        className="ds-swipe-btn relative flex shrink-0 items-center justify-center rounded-full will-change-transform"
        style={{
          width: size,
          height: size,
          color: primary ? "#fff" : tint,
          background: surface,
          border: `1px solid ${primary ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.08)"}`,
          boxShadow: shadow,
        }}
      >
        {/* Layer: soft contact shadow that tightens on press */}
        <span
          aria-hidden
          className="ds-swipe-shadow absolute rounded-full"
          style={{
            inset: "auto 12% -8% 12%",
            height: "40%",
            background: primary
              ? `radial-gradient(60% 100% at 50% 100%, ${tint}44, transparent 72%)`
              : "radial-gradient(60% 100% at 50% 100%, rgba(0,0,0,0.5), transparent 72%)",
            filter: "blur(6px)",
            zIndex: -1,
          }}
        />
        {/* Layer: tiny directional specular highlight near the top */}
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{
            top: "8%",
            left: "24%",
            right: "24%",
            height: "28%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)",
            opacity: primary ? 0.6 : 0.4,
            filter: "blur(1px)",
            pointerEvents: "none",
          }}
        />
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

function Stamp({ label, color, rotate }: { label: string; color: string; rotate: number }) {
  return (
    <span
      className="inline-block backdrop-blur-md"
      style={{
        transform: `rotate(${rotate}deg)`,
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

type FeedbackTone = "success" | "warning" | "danger" | "info";

const feedbackColor: Record<FeedbackTone, string> = {
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  info: colors.info,
};

/** Tone-tinted icon chip — the color-independent leading cue shared by every
 *  feedback surface (alert, toast, banner). */
function FeedbackIcon({
  tone,
  icon,
  size = 34,
}: {
  tone: FeedbackTone;
  icon: React.ReactNode;
  size?: number;
}) {
  const c = feedbackColor[tone];
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2.6,
        color: c,
        background: `linear-gradient(165deg, ${c}2e, ${c}12)`,
        border: `1px solid ${c}40`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 0 16px ${c}22`,
      }}
    >
      {icon}
    </span>
  );
}

function Alert({
  tone,
  icon,
  title,
  body,
  primaryAction,
  secondaryAction,
  onDismiss,
}: {
  tone: FeedbackTone;
  icon: React.ReactNode;
  title: string;
  body: string;
  primaryAction?: { label: string; onClick?: () => void };
  secondaryAction?: { label: string; onClick?: () => void };
  onDismiss?: () => void;
}) {
  const c = feedbackColor[tone];
  const hasActions = !!(primaryAction || secondaryAction);
  return (
    <div
      role="alert"
      className="ds-feedback backdrop-blur-xl"
      style={{
        position: "relative",
        borderRadius: radii.lg,
        padding: hasActions ? "16px 16px 14px" : "14px 16px",
        background: surfaces.glass,
        border: `1px solid ${surfaces.border}`,
        boxShadow: shadows.glass,
        overflow: "hidden",
      }}
    >
      {/* left accent hairline — subtle tone signature */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 12,
          bottom: 12,
          width: 3,
          borderRadius: radii.pill,
          background: `linear-gradient(180deg, ${c}, ${c}55)`,
        }}
      />
      <div className="flex items-start gap-3">
        <FeedbackIcon tone={tone} icon={icon} />
        <div className="min-w-0 flex-1">
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>
            {title}
          </div>
          <div style={{ color: colors.textSecondary, fontSize: 13.5, lineHeight: 1.45, marginTop: 3 }}>
            {body}
          </div>
          {hasActions && (
            <div className="mt-3 flex gap-2">
              {primaryAction && (
                <Button size="sm" variant="secondary" onClick={primaryAction.onClick}>
                  {primaryAction.label}
                </Button>
              )}
              {secondaryAction && (
                <Button size="sm" variant="ghost" onClick={secondaryAction.onClick}>
                  {secondaryAction.label}
                </Button>
              )}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            aria-label="Dismiss"
            onClick={() => {
              haptic("light");
              onDismiss();
            }}
            className="ds-press flex shrink-0 items-center justify-center rounded-full"
            style={{
              width: 30,
              height: 30,
              marginTop: -2,
              color: colors.textMuted,
              background: surfaces.glassSoft,
              border: `1px solid ${surfaces.borderSoft}`,
            }}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Floating toast — lightweight blurred surface, spring entry, swipe/tap to
 *  dismiss. Stacked and auto-dismissed by ToastHost. */
function Toast({
  tone,
  icon,
  message,
  onDismiss,
}: {
  tone: FeedbackTone;
  icon: React.ReactNode;
  message: string;
  onDismiss: () => void;
}) {
  const c = feedbackColor[tone];
  return (
    <div
      role="status"
      onClick={onDismiss}
      className="ds-toast-in ds-feedback flex items-center gap-2.5 backdrop-blur-xl"
      style={{
        borderRadius: radii.pill,
        padding: "9px 16px 9px 10px",
        background: "linear-gradient(165deg, rgba(28,37,69,0.86), rgba(14,20,48,0.86))",
        border: `1px solid ${surfaces.border}`,
        boxShadow: `${shadows.large}, 0 0 22px ${c}22`,
        cursor: "pointer",
      }}
    >
      <FeedbackIcon tone={tone} icon={icon} size={28} />
      <span style={{ color: "#fff", fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>
        {message}
      </span>
    </div>
  );
}

type ToastItem = { id: number; tone: FeedbackTone; icon: React.ReactNode; message: string };

/** Stacking toast host — new toasts spring in at the bottom, others reflow up,
 *  each auto-dismisses gracefully. */
function ToastHost({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 flex flex-col items-center gap-2"
      style={{ bottom: `calc(20px + env(safe-area-inset-bottom))`, zIndex: 80, padding: "0 16px" }}
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full" style={{ maxWidth: 380 }}>
          <Toast tone={t.tone} icon={t.icon} message={t.message} onDismiss={() => onDismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}

/** Inline banner — full-width contextual status (offline, permission, update). */
function Banner({
  tone,
  icon,
  title,
  action,
}: {
  tone: FeedbackTone;
  icon: React.ReactNode;
  title: string;
  action?: { label: string; onClick?: () => void };
}) {
  const c = feedbackColor[tone];
  return (
    <div
      className="ds-feedback flex items-center gap-3 backdrop-blur-xl"
      style={{
        borderRadius: radii.md,
        padding: "10px 12px 10px 14px",
        background: `linear-gradient(165deg, ${c}1c, rgba(14,20,48,0.6))`,
        border: `1px solid ${c}33`,
        boxShadow: shadows.medium,
      }}
    >
      <span aria-hidden style={{ color: c, display: "flex" }}>
        {icon}
      </span>
      <span className="min-w-0 flex-1" style={{ color: "#fff", fontSize: 13.5, fontWeight: 600 }}>
        {title}
      </span>
      {action && (
        <Button size="sm" variant="ghost" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}


// ---------------------------------------------------------------------------
// Chat design system
// ---------------------------------------------------------------------------

type GroupPos = "single" | "first" | "middle" | "last";
type MsgState = "sending" | "sent" | "delivered" | "read";

function bubbleRadii(mine: boolean, pos: GroupPos) {
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

function Ticks({ state }: { state: MsgState }) {
  const color = state === "read" ? colors.primary : "rgba(255,255,255,0.7)";
  if (state === "sending")
    return (
      <span
        className="ds-rec-pulse inline-block rounded-full"
        style={{ width: 9, height: 9, border: `1.5px solid rgba(255,255,255,0.6)` }}
        aria-label="Sending"
      />
    );
  if (state === "sent")
    return <Check style={{ width: 14, height: 14, color }} aria-label="Sent" />;
  return <CheckCheck style={{ width: 15, height: 15, color }} aria-label={state} />;
}

function MetaRow({ mine, time, state }: { mine: boolean; time?: string; state?: MsgState }) {
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

function Bubble({
  children,
  mine,
  groupPos = "single",
  tail,
  time,
  state,
  reactions,
  entrance,
}: {
  children: React.ReactNode;
  mine?: boolean;
  groupPos?: GroupPos;
  tail?: boolean;
  time?: string;
  state?: MsgState;
  reactions?: string[];
  entrance?: boolean;
}) {
  const isMine = !!mine;
  return (
    <div
      className={`flex flex-col ${entrance ? (isMine ? "ds-msg-out" : "ds-msg-in") : ""}`}
      style={{
        alignItems: isMine ? "flex-end" : "flex-start",
        marginTop: groupPos === "first" || groupPos === "single" ? 8 : 2,
        marginBottom: reactions?.length ? 8 : 0,
      }}
    >
      <div style={{ position: "relative", maxWidth: "80%" }}>
        <div
          style={{
            padding: "9px 14px",
            borderRadius: bubbleRadii(isMine, groupPos),
            ...type.bodyLg,
            fontSize: 15,
            lineHeight: 1.35,
            fontWeight: weights.medium,
            color: "#fff",
            background: isMine ? gradients.primaryButton : surfaces.glassSoft,
            border: `1px solid ${isMine ? "transparent" : surfaces.border}`,
            boxShadow: isMine ? shadows.primaryGlow : shadows.soft,
            wordBreak: "break-word",
          }}
        >
          {children}
        </div>
        {reactions?.length ? (
          <div
            className="ds-react-pop flex items-center gap-0.5 rounded-full"
            style={{
              position: "absolute",
              bottom: -12,
              [isMine ? "right" : "left"]: 10,
              padding: "2px 7px",
              background: "rgba(8,12,26,0.9)",
              border: `1px solid ${surfaces.border}`,
              boxShadow: shadows.soft,
              fontSize: 12,
            }}
          >
            {reactions.map((r, i) => (
              <span key={i}>{r}</span>
            ))}
          </div>
        ) : null}
      </div>
      {tail && <MetaRow mine={isMine} time={time} state={state} />}
    </div>
  );
}

function DayDivider({ label }: { label: string }) {
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

function ChatHeader() {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: `${spacing[3]}px ${spacing[4]}px`,
        borderBottom: `1px solid ${surfaces.borderSoft}`,
        background: "rgba(8,12,26,0.5)",
      }}
    >
      <button
        aria-label="Back"
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{ width: 36, height: 36, color: colors.primary }}
      >
        <ChevronLeft style={{ width: 24, height: 24 }} />
      </button>
      <Avatar src={ana} size="sm" status="online" />
      <div className="min-w-0 flex-1">
        <div style={{ ...type.titleMd, color: "#fff" }} className="truncate">
          Ana Rivera
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="rounded-full"
            style={{ width: 7, height: 7, background: colors.success, boxShadow: shadows.glow }}
          />
          <span style={{ ...type.caption, color: colors.success }}>Active now</span>
        </div>
      </div>
      <button
        aria-label="Voice call"
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{ width: 40, height: 40, color: "#fff", background: surfaces.glassSoft, border: `1px solid ${surfaces.border}` }}
      >
        <Phone style={{ width: 18, height: 18 }} />
      </button>
      <button
        aria-label="Video call"
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{ width: 40, height: 40, color: "#fff", background: surfaces.glassSoft, border: `1px solid ${surfaces.border}` }}
      >
        <Video style={{ width: 18, height: 18 }} />
      </button>
    </div>
  );
}

function TypingBubble() {
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

function VoiceMessage({ mine }: { mine?: boolean }) {
  const isMine = !!mine;
  return (
    <Bubble mine={isMine} groupPos="single" tail time="9:43" state={isMine ? "read" : undefined}>
      <div className="flex items-center gap-3" style={{ minWidth: 190 }}>
        <button
          aria-label="Play voice message"
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{ width: 34, height: 34, background: "rgba(255,255,255,0.16)", color: "#fff" }}
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
                background: i < 6 ? "#fff" : "rgba(255,255,255,0.4)",
                transformOrigin: "center",
              }}
            />
          ))}
        </div>
        <span style={{ ...type.caption, color: "rgba(255,255,255,0.85)" }}>0:12</span>
      </div>
    </Bubble>
  );
}

function ImageMessage({ mine, time, state }: { mine?: boolean; time?: string; state?: MsgState }) {
  const isMine = !!mine;
  return (
    <div
      className="ds-msg-out flex flex-col"
      style={{ alignItems: isMine ? "flex-end" : "flex-start", marginTop: 8 }}
    >
      <div
        style={{
          width: 200,
          height: 148,
          borderRadius: radii.md,
          overflow: "hidden",
          border: `1px solid ${surfaces.border}`,
          boxShadow: shadows.medium,
          background: gradients.blueGloss,
          position: "relative",
        }}
      >
        <div
          className="ds-shimmer"
          style={{ position: "absolute", inset: 0, opacity: 0.25 }}
        />
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ position: "relative" }}
        >
          <Camera style={{ width: 30, height: 30, color: "rgba(255,255,255,0.9)" }} />
        </div>
      </div>
      <MetaRow mine={isMine} time={time} state={state} />
    </div>
  );
}

function ComposerAction({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: 38, height: 38, color: colors.textSecondary }}
    >
      {icon}
    </button>
  );
}

function Composer() {
  return (
    <div
      className="flex items-end gap-2"
      style={{
        padding: `${spacing[2]}px ${spacing[3]}px calc(${spacing[3]}px + env(safe-area-inset-bottom, 0px))`,
        borderTop: `1px solid ${surfaces.borderSoft}`,
        background: "rgba(8,12,26,0.6)",
      }}
    >
      <ComposerAction icon={<Plus style={{ width: 22, height: 22 }} />} label="Attachments" />
      <div
        className="flex flex-1 items-center gap-2"
        style={{
          minHeight: 42,
          padding: "6px 8px 6px 16px",
          borderRadius: radii.lg,
          background: surfaces.glassSoft,
          border: `1px solid ${surfaces.border}`,
        }}
      >
        <span style={{ ...type.bodyLg, fontSize: 15, color: colors.textMuted, flex: 1 }}>
          Message…
        </span>
        <button
          aria-label="Camera"
          className="flex shrink-0 items-center justify-center"
          style={{ color: colors.textSecondary }}
        >
          <Camera style={{ width: 21, height: 21 }} />
        </button>
        <button
          aria-label="Emoji"
          className="flex shrink-0 items-center justify-center"
          style={{ color: colors.textSecondary }}
        >
          <Smile style={{ width: 21, height: 21 }} />
        </button>
      </div>
      <button
        aria-label="Send"
        onPointerDown={() => haptic("messageSent")}
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{
          width: 42,
          height: 42,
          background: gradients.primaryButton,
          boxShadow: shadows.primaryGlow,
          color: "#fff",
        }}
      >
        <ArrowUp style={{ width: 20, height: 20 }} strokeWidth={2.5} />
      </button>
    </div>
  );
}


function SettingRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>{label}</span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Navigation design system
// ---------------------------------------------------------------------------

function NavBadge({ count }: { count: number }) {
  return (
    <span
      className="ds-react-pop flex items-center justify-center rounded-full"
      style={{
        position: "absolute",
        top: -2,
        right: -2,
        minWidth: 17,
        height: 17,
        padding: "0 5px",
        background: colors.danger,
        color: "#fff",
        fontSize: 10,
        fontWeight: weights.bold,
        lineHeight: 1,
        border: `2px solid rgba(8,12,26,0.95)`,
        boxShadow: "0 0 10px rgba(242,87,107,0.6)",
      }}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

function NavAction({
  children,
  label,
  badge,
}: {
  children: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      aria-label={label}
      className="ds-press flex items-center justify-center rounded-full"
      style={{
        position: "relative",
        width: 44,
        height: 44,
        color: "#fff",
      }}
    >
      {children}
      {badge ? <NavBadge count={badge} /> : null}
    </button>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: number;
  onChange: (i: number) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Segmented control"
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        padding: 4,
        borderRadius: radii.md,
        background: "rgba(8,12,26,0.5)",
        border: `1px solid ${surfaces.borderSoft}`,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 4,
          bottom: 4,
          left: `calc(${(value * 100) / options.length}% + 4px)`,
          width: `calc(${100 / options.length}% - 8px)`,
          borderRadius: radii.sm,
          background: gradients.primaryButton,
          boxShadow: shadows.primaryGlow,
          transition: `left ${motion.base} ${motion.snappy}`,
        }}
      />
      {options.map((opt, i) => (
        <button
          key={opt}
          role="tab"
          aria-selected={value === i}
          onClick={() => onChange(i)}
          style={{
            position: "relative",
            zIndex: 1,
            padding: "9px 4px",
            ...type.label,
            fontSize: 13,
            color: value === i ? "#fff" : colors.textSecondary,
            transition: `color ${motion.fast} ${motion.snappy}`,
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function ScrollTabs({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Scrollable tabs"
      className="flex items-center gap-2 overflow-x-auto"
      style={{ scrollbarWidth: "none", margin: "0 -2px", padding: "2px" }}
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt)}
            className="ds-press shrink-0"
            style={{
              position: "relative",
              padding: "8px 4px",
              ...type.label,
              fontSize: 15,
              color: active ? "#fff" : colors.textMuted,
              transition: `color ${motion.fast} ${motion.snappy}`,
            }}
          >
            {opt}
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: 4,
                right: 4,
                bottom: 0,
                height: 3,
                borderRadius: 3,
                background: active ? gradients.primaryButton : "transparent",
                boxShadow: active ? shadows.primaryGlow : "none",
                transition: `background ${motion.fast} ${motion.snappy}`,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

const TABS = [
  { icon: Home, label: "Home" },
  { icon: Search, label: "Search" },
  { icon: Heart, label: "Likes", badge: 5 },
  { icon: MessageCircle, label: "Chats", badge: 2 },
  { icon: User, label: "Profile" },
];

function FloatingTabBar({
  active,
  onChange,
}: {
  active: number;
  onChange: (i: number) => void;
}) {
  return (
    <nav
      aria-label="Primary"
      className="flex items-center"
      style={{
        justifyContent: "space-between",
        padding: 8,
        borderRadius: radii.xl,
        background: "rgba(10,14,28,0.72)",
        backdropFilter: "blur(24px) saturate(150%)",
        border: `1px solid ${surfaces.border}`,
        boxShadow: shadows.glass,
      }}
    >
      {TABS.map((tab, i) => {
        const isActive = active === i;
        const Icon = tab.icon;
        return (
          <button
            key={tab.label}
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onChange(i)}
            className="ds-press flex items-center justify-center"
            style={{
              position: "relative",
              gap: 8,
              height: 48,
              flex: isActive ? "1 1 auto" : "0 0 auto",
              minWidth: 48,
              padding: isActive ? "0 18px" : "0 12px",
              borderRadius: radii.pill,
              color: isActive ? "#fff" : colors.textMuted,
              background: isActive ? gradients.primaryButton : "transparent",
              boxShadow: isActive ? shadows.primaryGlow : "none",
              transition: `flex ${motion.base} ${motion.snappy}, background ${motion.base} ${motion.snappy}, color ${motion.fast} ${motion.snappy}, padding ${motion.base} ${motion.snappy}`,
            }}
          >
            <span style={{ position: "relative", display: "flex" }}>
              <Icon style={{ width: 22, height: 22 }} strokeWidth={isActive ? 2.4 : 2} />
              {tab.badge && !isActive ? <NavBadge count={tab.badge} /> : null}
            </span>
            {isActive && (
              <span style={{ ...type.label, fontSize: 14, whiteSpace: "nowrap" }}>
                {tab.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

