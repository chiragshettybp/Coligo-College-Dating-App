import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
} from "@/lib/ds";
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

import memoji1 from "@/assets/memoji1.jpg";
import memoji2 from "@/assets/memoji2.jpg";
import memoji3 from "@/assets/memoji3.jpg";
import memoji4 from "@/assets/memoji4.jpg";
import memoji5 from "@/assets/memoji5.jpg";
import ana from "@/assets/ana.jpg";

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

  const toggleInterest = (i: string) =>
    setInterests((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));

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
              <SwipeControl label="Undo" size={46} tint={colors.warning}>
                <RotateCcw style={{ width: 20, height: 20 }} strokeWidth={2.4} />
              </SwipeControl>
              <SwipeControl label="Nope" size={58} tint={colors.danger}>
                <X style={{ width: 26, height: 26 }} strokeWidth={2.8} />
              </SwipeControl>
              <SwipeControl label="Super" size={52} tint={colors.info}>
                <Star style={{ width: 22, height: 22 }} fill="currentColor" />
              </SwipeControl>
              <SwipeControl label="Like" size={68} tint={colors.success} primary>
                <Heart style={{ width: 30, height: 30 }} fill="#fff" />
              </SwipeControl>
              <SwipeControl label="Boost" size={52} tint={colors.accent}>
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
        <Section title="Badges" description="Verification, status and metadata tags.">
          <Row>
            <Badge tone="success"><ShieldCheck style={{ width: 12, height: 12 }} /> Verified</Badge>
            <Badge tone="primary"><Sparkles style={{ width: 12, height: 12 }} /> Premium</Badge>
            <Badge tone="info">New</Badge>
            <Badge tone="warning">Popular</Badge>
            <Badge tone="danger">Trending</Badge>
            <Badge tone="neutral"><GraduationCap style={{ width: 12, height: 12 }} /> CS · Year 2</Badge>
          </Row>
        </Section>

        {/* Alerts */}
        <Section title="Alerts & Toasts" description="Success, warning, error and info feedback surfaces.">
          <div className="space-y-3">
            <Alert tone="success" icon={<Check style={{ width: 18, height: 18 }} />} title="Profile saved" body="Your changes are live." />
            <Alert tone="warning" icon={<AlertTriangle style={{ width: 18, height: 18 }} />} title="Add more photos" body="Profiles with 4+ photos get 3x more matches." />
            <Alert tone="danger" icon={<X style={{ width: 18, height: 18 }} />} title="Something went wrong" body="We couldn't send your message." />
            <Alert tone="info" icon={<Info style={{ width: 18, height: 18 }} />} title="New feature" body="You can now filter by department." />
          </div>
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
                tail
                time="9:42"
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
        <Section title="Navigation" description="Bottom tab bar and top bar patterns.">
          <div className="space-y-4">
            <GlassPanel style={{ padding: `${spacing[2]}px ${spacing[4]}px` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center" style={{ gap: spacing[2] }}>
                  <Avatar src={ana} size="sm" />
                  <span style={{ color: "#fff", fontWeight: 700 }}>Discover</span>
                </div>
                <div className="flex items-center" style={{ gap: spacing[1] }}>
                  <IconButton size={44}><Search style={{ width: 18, height: 18 }} /></IconButton>
                  <IconButton size={44}><Bell style={{ width: 18, height: 18 }} /></IconButton>
                </div>
              </div>
            </GlassPanel>
            <GlassPanel style={{ padding: `${spacing[1]}px ${spacing[1]}px` }}>
              <div className="flex items-center justify-around">
                <TabIcon icon={<Home style={{ width: 22, height: 22 }} />} active />
                <TabIcon icon={<Search style={{ width: 22, height: 22 }} />} />
                <TabIcon icon={<Heart style={{ width: 22, height: 22 }} />} />
                <TabIcon icon={<MessageCircle style={{ width: 22, height: 22 }} />} />
                <TabIcon icon={<User style={{ width: 22, height: 22 }} />} />
              </div>
            </GlassPanel>
          </div>
        </Section>

        <footer
          className="flex items-center gap-2"
          style={{ color: colors.textMuted, fontSize: 13, marginTop: spacing[8] }}
        >
          <Settings style={{ width: 14, height: 14 }} />
          One system, every screen. Import from{" "}
          <code style={{ color: colors.info }}>@/components/ds/glass</code>.
        </footer>
      </div>
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
      <div style={{ position: "relative", height: 380 }}>
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
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#fff",
                  background: gradients.success,
                  boxShadow: shadows.glow,
                }}
              >
                <Sparkles style={{ width: 12, height: 12 }} /> 92%
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
}: {
  children: React.ReactNode;
  label?: string;
  size?: number;
  tint: string;
  primary?: boolean;
}) {
  return (
    <div className="flex flex-col items-center" style={{ gap: spacing[1] }}>
      <IconButton
        size={size}
        primary={primary}
        aria-label={label}
        style={{
          color: primary ? "#fff" : tint,
          background: primary
            ? `linear-gradient(160deg, ${tint} 0%, ${tint}cc 100%)`
            : gradients.glassButton,
          border: `1px solid ${primary ? "rgba(255,255,255,0.28)" : surfaces.border}`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 24px ${tint}55`,
        }}
      >
        {children}
      </IconButton>
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

function Alert({
  tone,
  icon,
  title,
  body,
}: {
  tone: "success" | "warning" | "danger" | "info";
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const map = {
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    info: colors.info,
  };
  const c = map[tone];
  return (
    <div
      className="flex items-start gap-3 backdrop-blur-md"
      style={{
        borderRadius: radii.md,
        padding: "14px 16px",
        background: surfaces.glassSoft,
        border: `1px solid ${surfaces.border}`,
        borderLeft: `3px solid ${c}`,
      }}
    >
      <span
        className="flex items-center justify-center rounded-full"
        style={{ width: 34, height: 34, background: `${c}22`, color: c }}
      >
        {icon}
      </span>
      <div>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{title}</div>
        <div style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{body}</div>
      </div>
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
      <Avatar src={ana} size={40} />
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

function TabIcon({ icon, active }: { icon: React.ReactNode; active?: boolean }) {
  return (
    <button
      className="flex items-center justify-center rounded-full"
      style={{
        width: 48,
        height: 48,
        color: active ? "#fff" : colors.textMuted,
        background: active ? gradients.primaryButton : "transparent",
        boxShadow: active ? shadows.primaryGlow : "none",
      }}
    >
      {icon}
    </button>
  );
}
