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
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardMedia,
  StatCard,
  AlertCard,
  EmptyStateCard,
  InfoCard,
  SettingsCard,
  SettingsRow,
} from "@/components/ds/card";
import {
  Avatar,
  Badge,
  IdentityBadge,
  PresenceBadge,
  CompatibilityBadge,
  Button,
  Chip,
  GlassPanel,
  IconButton,
  Fab,
  ProgressBar,
  Skeleton,
  Text,
  TextField,
  Toggle,
} from "@/components/ds/glass";
import {
  TopBar,
  LargeTitleHeader,
  NavIconButton,
  SegmentControl,
  ScrollTabs,
  BottomNav,
  BottomSheet,
  ActionSheet,
  SearchBar,
  NavFab,
  type BottomNavItem,
} from "@/components/ds/navigation";
import { EmptyStateFromPreset } from "@/components/ds/empty-state";
import { MatchCelebration } from "@/components/ds/match-celebration";
import {
  Switch,
  SettingsGroup,
  SettingsItem,
  RadioGroup,
  Checkbox,
  Dropdown,
  Slider,
  CollapsibleGroup,
  DangerZone,
} from "@/components/ds/settings";



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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [navSearch, setNavSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [setPrivate, setSetPrivate] = useState(true);
  const [showOnline, setShowOnline] = useState(false);
  const [readReceipts, setReadReceipts] = useState(true);
  const [distance, setDistance] = useState(25);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [ageRange, setAgeRange] = useState("18-24");
  const [likesOnly, setLikesOnly] = useState(false);

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
          description="One production-grade scale. Every role is a token — Display through Badge Label — with optical tracking, tuned line height and tabular numerics. Hierarchy comes from type, not color."
        >
          <GlassPanel style={{ padding: spacing[5] }}>
            <div className="flex flex-col" style={{ gap: spacing[3] }}>
              <Text variant="displayXl">Display XL</Text>
              <Text variant="displayLg">Display L</Text>
              <Text variant="headingXl">Heading XL</Text>
              <Text variant="headingLg">Heading L</Text>
              <Text variant="headingMd">Heading M</Text>
              <Text variant="headingSm">Heading S</Text>
              <Text variant="title">Title</Text>
              <Text variant="bodyLg" tone="secondary">
                Body Large — the quick brown fox jumps over the lazy dog.
              </Text>
              <Text variant="body" tone="secondary">
                Body — the quick brown fox jumps over the lazy dog.
              </Text>
              <Text variant="bodySm" tone="muted">
                Body Small — supporting detail and helper text.
              </Text>
              <Text variant="caption" tone="muted">
                Caption — metadata and timestamps
              </Text>
              <Text variant="overline" tone="muted">
                Overline
              </Text>
              <div className="flex flex-wrap items-center" style={{ gap: spacing[4] }}>
                <Text variant="label">Label</Text>
                <Text variant="buttonLabel">Button Label</Text>
                <Text variant="navLabel" tone="muted">Nav Label</Text>
                <Text variant="badgeLabel" tone="muted">Badge</Text>
              </div>
            </div>

            <div
              style={{
                marginTop: spacing[5],
                paddingTop: spacing[4],
                borderTop: `1px solid ${surfaces.border}`,
              }}
            >
              <Text variant="overline" tone="muted">Numeric alignment</Text>
              <div className="mt-2 flex flex-col" style={{ gap: 2 }}>
                <Text variant="title" numeric align="right" style={{ width: 140 }}>1,204.50</Text>
                <Text variant="title" numeric align="right" style={{ width: 140 }}>98.00</Text>
                <Text variant="title" numeric align="right" style={{ width: 140 }}>52,002.50</Text>
              </div>
            </div>

            <div
              style={{
                marginTop: spacing[5],
                paddingTop: spacing[4],
                borderTop: `1px solid ${surfaces.border}`,
              }}
            >
              <Text variant="overline" tone="muted">Truncation &amp; clamp</Text>
              <div className="mt-2" style={{ maxWidth: 260 }}>
                <Text variant="body" tone="secondary" truncate>
                  Single line truncates with an ellipsis when it runs out of room here.
                </Text>
                <Text variant="body" tone="secondary" clamp={2} style={{ marginTop: spacing[2] }}>
                  This paragraph clamps cleanly to two lines and then adds an ellipsis, no matter how much text follows it in the string content.
                </Text>
              </div>
            </div>
          </GlassPanel>
        </Section>


        {/* Buttons */}
        <Section
          title="Buttons"
          description="One tactile button system — every variant, size and state. Solid restrained surfaces, hairline borders, spring press and clear focus."
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
                <Fab aria-label="New">
                  <Plus style={{ width: 26, height: 26 }} />
                </Fab>
                <Fab label="Compose">
                  <Plus style={{ width: 22, height: 22 }} />
                </Fab>
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
          description="One reusable, content-first card system — the primary building block of every screen."
        >
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
            {/* Swipe / profile card */}
            <SwipeCard />

            {/* Profile card — media + header + CTA */}
            <Card padding={0}>
              <CardMedia
                src={ana}
                alt="Maya"
                height={200}
                overlay={
                  <div style={{ position: "absolute", left: spacing[3], bottom: spacing[3], display: "flex", gap: spacing[1] }}>
                    <Badge tone="success"><Check style={{ width: 12, height: 12 }} /> Verified</Badge>
                    <PresenceBadge online />
                  </div>
                }
              />
              <div style={{ padding: spacing[4] }}>
                <CardHeader title="Maya, 21" subtitle="Design · Junior" />
                <CardBody>
                  <div className="flex flex-wrap" style={{ gap: spacing[1] }}>
                    <IdentityBadge type="sameCollege" />
                    <IdentityBadge type="mutualInterests" label="3 shared" />
                  </div>
                </CardBody>
                <CardFooter>
                  <Button fullWidth variant="primary" leftIcon={<MessageCircle style={{ width: 18, height: 18 }} />}>
                    Say hi
                  </Button>
                </CardFooter>
              </div>
            </Card>

            {/* Stats */}
            <StatCard label="Matches this week" value="24" delta="+8 vs last week" deltaTone="up" icon={<Heart style={{ width: 18, height: 18 }} />} />
          </div>

          {/* Alerts */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", marginTop: spacing[4] }}>
            <AlertCard tone="success" title="Profile verified" message="Your student ID has been confirmed." />
            <AlertCard
              tone="warning"
              title="Add more photos"
              message="Profiles with 3+ photos get 2× more matches."
              action={<Button size="sm" variant="secondary">Upload</Button>}
            />
            <AlertCard tone="danger" title="Verification failed" message="We couldn't read your ID. Try again." />
          </div>

          {/* Info + empty state */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", marginTop: spacing[4] }}>
            <InfoCard icon={<ShieldCheck style={{ width: 18, height: 18 }} />} title="Safe & private">
              Only verified students can see your profile. You control who you match with.
            </InfoCard>
            <EmptyStateCard
              icon={<Search style={{ width: 26, height: 26 }} />}
              title="No new profiles"
              description="You're all caught up. Check back later for fresh matches nearby."
              action={<Button size="sm" variant="secondary" leftIcon={<RotateCcw style={{ width: 16, height: 16 }} />}>Refresh</Button>}
            />
          </div>

          {/* Settings grouped card */}
          <div style={{ marginTop: spacing[4] }}>
            <SettingsCard>
              <SettingsRow
                title="Notifications"
                subtitle="Matches, messages & likes"
                leading={<Bell style={{ width: 20, height: 20, color: colors.textSecondary }} />}
                onClick={() => haptic("light")}
              />
              <SettingsRow
                title="Privacy"
                subtitle="Who can see you"
                leading={<ShieldCheck style={{ width: 20, height: 20, color: colors.textSecondary }} />}
                onClick={() => haptic("light")}
              />
              <SettingsRow
                title="Discovery"
                leading={<MapPin style={{ width: 20, height: 20, color: colors.textSecondary }} />}
                trailing={<Text variant="bodySm" tone="muted">5 km</Text>}
                onClick={() => haptic("light")}
              />
            </SettingsCard>
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
              <SwipeControl label="Like" size={68} tint={colors.success} primary hapticToken="softSuccess" onClick={() => setMatchOpen(true)}>
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
          description="One identity system — soft surfaces, hairline borders, restrained color. Every badge communicates meaning, never decoration."
        >
          <Label>Presence</Label>
          <Row>
            <PresenceBadge online />
            <PresenceBadge online={false} />
          </Row>
          <div style={{ height: spacing[3] }} />
          <Label>Identity</Label>
          <Row>
            <IdentityBadge type="verified" />
            <IdentityBadge type="premium" />
            <IdentityBadge type="new" />
            <IdentityBadge type="popular" />
            <IdentityBadge type="trending" />
          </Row>
          <div style={{ height: spacing[3] }} />
          <Label>Context</Label>
          <Row>
            <IdentityBadge type="sameCollege" />
            <IdentityBadge type="sameDepartment" />
            <IdentityBadge type="sameSemester" />
            <IdentityBadge type="mutualInterests" label="3 mutual interests" />
          </Row>
          <div style={{ height: spacing[3] }} />
          <Label>Compatibility</Label>
          <Row>
            <CompatibilityBadge value={96} />
            <CompatibilityBadge value={82} label="compatible" />
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

          <div style={{ height: spacing[4] }} />
          <Label>Confirmation dialog</Label>
          <Row>
            <Button size="sm" variant="secondary" onClick={() => setConfirmOpen(true)}>
              Delete account
            </Button>
          </Row>

          <div style={{ height: spacing[4] }} />
          <Label>Bottom action bar</Label>
          <div style={{ borderRadius: radii.lg, overflow: "hidden", border: `1px solid ${surfaces.borderSoft}` }}>
            <div style={{ height: 96, background: "rgba(120,120,128,0.06)" }} />
            <BottomActionBar>
              <Button variant="ghost">Skip</Button>
              <Button fullWidth variant="primary">Continue</Button>
            </BottomActionBar>
          </div>
        </Section>

        <ConfirmDialog
          open={confirmOpen}
          tone="danger"
          icon={<AlertTriangle style={{ width: 24, height: 24 }} />}
          title="Delete account?"
          body="This permanently removes your profile, matches and messages. This can't be undone."
          confirmLabel="Delete"
          cancelLabel="Keep account"
          onConfirm={() => {
            setConfirmOpen(false);
            pushToast("success", <Check style={{ width: 15, height: 15 }} />, "Account deleted");
          }}
          onCancel={() => setConfirmOpen(false)}
        />


        {/* Chat */}
        <Section
          title="Chat"
          description="A native messaging surface — grouped bubbles, receipts, reactions, voice, media and composer."
        >
          <GlassPanel style={{ padding: 0, overflow: "hidden" }}>
            <ChatHeader name="Ana Rivera" avatarSrc={ana} online statusText="Active now" />
            <div
              className="flex flex-col"
              style={{
                padding: `${spacing[4]}px ${spacing[4]}px ${spacing[3]}px`,
                gap: 2,
                background: "linear-gradient(180deg, #f6f7f9 0%, #f3f4f6 100%)",
              }}
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
        <Section
          title="Settings Controls"
          description="Not a boring list — grouped cards, hairline separators, large touch areas, leading icon tiles and a full family of tactile controls. Switches, segmented, radio, checkbox, dropdown, slider, collapsible groups and a calm danger zone. One reusable system."
        >
          <div className="space-y-6">
            <SettingsGroup label="Notifications" footnote="Choose what reaches you and how.">
              <SettingsItem
                icon={<BellRing style={{ width: 17, height: 17 }} />}
                iconTint={colors.accent}
                title="Push notifications"
                subtitle="Matches, likes and messages"
                trailing={<Switch checked={notif} onChange={setNotif} />}
              />
              <SettingsItem
                icon={<Heart style={{ width: 17, height: 17 }} />}
                iconTint={colors.accent}
                title="Only new likes"
                trailing={<Switch checked={likesOnly} onChange={setLikesOnly} />}
              />
              <SettingsItem
                icon={<CheckCheck style={{ width: 17, height: 17 }} />}
                title="Read receipts"
                trailing={<Switch checked={readReceipts} onChange={setReadReceipts} tone="success" />}
              />
            </SettingsGroup>

            <SettingsGroup label="Privacy">
              <SettingsItem
                icon={<ShieldCheck style={{ width: 17, height: 17 }} />}
                iconTint={colors.success}
                title="Private profile"
                subtitle="Only matches can see your photos"
                trailing={<Switch checked={setPrivate} onChange={setSetPrivate} />}
              />
              <SettingsItem
                icon={<Zap style={{ width: 17, height: 17 }} />}
                iconTint={colors.warning}
                title="Show when online"
                trailing={<Switch checked={showOnline} onChange={setShowOnline} />}
              />
              <SettingsItem
                icon={<User style={{ width: 17, height: 17 }} />}
                title="Blocked users"
                value="3"
                onClick={() => haptic("light")}
              />
            </SettingsGroup>

            <SettingsGroup label="Appearance" footnote="Theme applies across the whole app.">
              <RadioGroup
                value={theme}
                onChange={setTheme}
                options={[
                  { value: "light", label: "Light", subtitle: "Always bright" },
                  { value: "dark", label: "Dark", subtitle: "Always dim" },
                  { value: "system", label: "System", subtitle: "Match your device" },
                ]}
              />
            </SettingsGroup>

            <SettingsGroup label="Discovery">
              <SettingsItem
                icon={<MapPin style={{ width: 17, height: 17 }} />}
                title="Maximum distance"
                value={`${distance} km`}
              />
              <div style={{ padding: `${spacing[1]}px ${spacing[3]}px ${spacing[3]}px 56px` }}>
                <Slider value={distance} onChange={setDistance} min={1} max={100} />
              </div>
              <SettingsItem
                icon={<Sparkles style={{ width: 17, height: 17 }} />}
                iconTint="#7a6bff"
                title="Age range"
                trailing={
                  <Dropdown
                    value={ageRange}
                    onChange={setAgeRange}
                    options={[
                      { value: "18-24", label: "18 – 24" },
                      { value: "25-30", label: "25 – 30" },
                      { value: "31-40", label: "31 – 40" },
                    ]}
                  />
                }
              />
            </SettingsGroup>

            <SettingsGroup label="Interests">
              <div style={{ padding: `${spacing[2]}px ${spacing[3]}px` }}>
                <div className="space-y-3">
                  {["Music", "Coffee", "Travel", "Fitness"].map((label) => (
                    <label key={label} className="flex items-center" style={{ gap: spacing[2] }}>
                      <Checkbox
                        checked={interests.includes(label)}
                        onChange={() => toggleInterest(label)}
                      />
                      <span style={{ ...type.label, fontWeight: weights.medium, color: colors.textPrimary }}>
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </SettingsGroup>

            <CollapsibleGroup label="Advanced">
              <SettingsItem title="Clear search history" onClick={() => haptic("light")} />
              <div style={{ height: 1, background: surfaces.borderSoft, marginLeft: spacing[3] }} />
              <SettingsItem title="Download my data" onClick={() => haptic("light")} />
            </CollapsibleGroup>

            <DangerZone>
              <SettingsItem
                danger
                title="Deactivate account"
                subtitle="Hide your profile temporarily"
                onClick={() => haptic("warning")}
              />
              <SettingsItem
                danger
                title="Delete account"
                subtitle="Permanently remove everything"
                onClick={() => haptic("warning")}
              />
            </DangerZone>
          </div>
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

        {/* Empty states */}
        <Section
          title="Empty States"
          description="Never missing content — every zero-data moment becomes guidance. One reusable system: bespoke breathing illustration, supportive copy, one clear next step. Soft colors, generous whitespace, progressive reveal."
        >
          <div className="space-y-4">
            {(
              [
                "noMatches",
                "noMessages",
                "profileIncomplete",
                "noPhotos",
                "noSearchResults",
                "offline",
                "permission",
                "welcome",
              ] as const
            ).map((key) => (
              <EmptyStateFromPreset
                key={key}
                preset={key}
                onPrimary={() => haptic("selection")}
                onSecondary={() => haptic("light")}
              />
            ))}
          </div>
        </Section>


        {/* Navigation */}
        <Section
          title="Navigation"
          description="One invisible navigation system — collapsible large title, glass top bar, search, segmented + scrollable tabs, floating tab bar, bottom sheet, action sheet and FAB. Every surface inherits the same tokens."
        >
          <div className="space-y-4">
            {/* Collapsible large-title header */}
            <LargeTitleHeader
              eyebrow="Sunday, July 12"
              title="Discover"
              collapsed={headerCollapsed}
              actions={
                <>
                  <NavIconButton label="Notifications" badge={3}>
                    <Bell style={{ width: 19, height: 19 }} />
                  </NavIconButton>
                  <button aria-label="Profile" className="rounded-full" style={{ marginLeft: 2 }}>
                    <Avatar src={ana} size="sm" status="online" />
                  </button>
                </>
              }
            />

            <Button variant="secondary" onClick={() => setHeaderCollapsed((c) => !c)}>
              {headerCollapsed ? "Expand title" : "Collapse title"}
            </Button>

            {/* Search bar */}
            <SearchBar
              value={navSearch}
              onChange={setNavSearch}
              placeholder="Search people, interests…"
              icon={<Search style={{ width: 18, height: 18 }} />}
            />

            {/* Compact glass top bar with back + centered title */}
            <TopBar
              title="Profile"
              onBack={() => haptic("light")}
              trailing={
                <NavIconButton label="More" onClick={() => setActionOpen(true)}>
                  <Plus style={{ width: 20, height: 20 }} />
                </NavIconButton>
              }
            />

            {/* Segmented control */}
            <SegmentControl
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

            {/* Sheets */}
            <div className="flex" style={{ gap: spacing[2] }}>
              <Button variant="secondary" onClick={() => setSheetOpen(true)}>
                Bottom sheet
              </Button>
              <Button variant="secondary" onClick={() => setActionOpen(true)}>
                Action sheet
              </Button>
            </div>

            {/* Floating bottom tab bar + FAB */}
            <div
              className="flex items-center"
              style={{ position: "relative", gap: spacing[2], paddingTop: spacing[2] }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <BottomNav items={NAV_ITEMS} active={activeTab} onChange={setActiveTab} />
              </div>
              <NavFab label="New" onClick={() => haptic("medium")}>
                <Plus style={{ width: 26, height: 26 }} />
              </NavFab>
            </div>
          </div>

          <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters">
            <div className="space-y-3" style={{ marginTop: spacing[3] }}>
              <SegmentControl
                options={["Everyone", "Women", "Men"]}
                value={segment}
                onChange={setSegment}
              />
              <Text tone="secondary">Drag the handle down or tap outside to dismiss.</Text>
            </div>
          </BottomSheet>

          <ActionSheet
            open={actionOpen}
            onClose={() => setActionOpen(false)}
            actions={[
              { label: "Share profile", onSelect: () => haptic("light") },
              { label: "Report", destructive: true, onSelect: () => haptic("warning") },
            ]}
          />
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
            semester: "Junior · Fall ’25",
            interests: ["Music", "Coffee", "Hiking"],
            compatibility: 94,
            conversationStarter: "Coffee before the design showcase this week?",
          }}
          onClose={() => setMatchOpen(false)}
          onOpenChat={(message) => {
            setMatchOpen(false);
            pushToast("success", <MessageCircle style={{ width: 16, height: 16 }} />, `Sent to Jordan: “${message}”`);
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

// Match Celebration now lives in @/components/ds/match-celebration (imported above).






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
  // Live drag state — the card follows the finger 1:1, then either flings out
  // with momentum or springs back. Rotation, elastic stack interpolation and
  // threshold stamps are all derived from the same pointer position.
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [springing, setSpringing] = useState(false);
  const start = useRef({ x: 0, y: 0, t: 0 });
  const last = useRef({ x: 0, y: 0, t: 0, vx: 0, vy: 0 });
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const THRESHOLD = 110;

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (springing) return;
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

  const settle = () => setDrag({ x: 0, y: 0 });

  const fling = (dirX: number, dirY: number) => {
    haptic("light");
    setSpringing(true);
    setDrag({ x: dirX * 620, y: dirY * 620 + drag.y * 0.6 });
    resetTimer.current = setTimeout(() => {
      setSpringing(false);
      // Snap the next card into place without animating the reset.
      requestAnimationFrame(() => {
        setDrag({ x: 0, y: 0 });
      });
    }, 260);
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    const { vx, vy } = last.current;
    const flingLeft = drag.x < -THRESHOLD || vx < -0.6;
    const flingRight = drag.x > THRESHOLD || vx > 0.6;
    const flingUp = drag.y < -THRESHOLD || vy < -0.6;
    if (flingUp && Math.abs(drag.y) > Math.abs(drag.x)) fling(0, -1);
    else if (flingRight) fling(1, 0);
    else if (flingLeft) fling(-1, 0);
    else {
      setSpringing(true);
      settle();
      resetTimer.current = setTimeout(() => setSpringing(false), 320);
    }
  };

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const rotation = drag.x / 18;
  const likeOp = clamp01(drag.x / THRESHOLD);
  const nopeOp = clamp01(-drag.x / THRESHOLD);
  const superOp = clamp01(-drag.y / THRESHOLD);
  const progress = clamp01(Math.hypot(drag.x, drag.y) / 140);
  // Behind cards rise toward the top as the front card leaves.
  const secondScale = 0.95 + 0.05 * progress;
  const secondY = 11 * (1 - progress);
  const thirdScale = 0.9 + 0.05 * progress;
  const thirdY = 22 - 11 * progress;

  const frontTransition = dragging
    ? "none"
    : `transform ${springing ? 0.42 : 0.32}s ${springing ? SPRING : "cubic-bezier(0.22,1,0.36,1)"}`;

  return (
    <div style={{ position: "relative", touchAction: "none", userSelect: "none" }}>
      {/* third card */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translateY(${thirdY}px) scale(${thirdScale})`,
          opacity: 0.35 + 0.25 * progress,
          transition: dragging ? "none" : "transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.32s ease",
        }}
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
        style={{
          transform: `translateY(${secondY}px) scale(${secondScale})`,
          opacity: 0.6 + 0.4 * progress,
          transition: dragging ? "none" : "transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.32s ease",
        }}
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
      {/* top card — follows the finger */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "relative",
          transform: `translate3d(${drag.x}px, ${drag.y}px, 0) rotate(${rotation}deg)`,
          transition: frontTransition,
          cursor: dragging ? "grabbing" : "grab",
          willChange: "transform",
        }}
      >
        <SwipeCard />
        {/* live threshold stamps driven by the drag position */}
        <div className="pointer-events-none absolute" style={{ top: spacing[6], left: spacing[4], opacity: likeOp, transform: `rotate(-12deg) scale(${0.9 + 0.1 * likeOp})` }}>
          <Stamp label="LIKE" color={colors.success} rotate={0} />
        </div>
        <div className="pointer-events-none absolute" style={{ top: spacing[6], right: spacing[4], opacity: nopeOp, transform: `rotate(12deg) scale(${0.9 + 0.1 * nopeOp})` }}>
          <Stamp label="NOPE" color={colors.danger} rotate={0} />
        </div>
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ bottom: 120, opacity: superOp, transform: `translateX(-50%) scale(${0.9 + 0.1 * superOp})` }}>
          <Stamp label="SUPER" color={colors.info} rotate={0} />
        </div>
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
  onClick,
}: {
  children: React.ReactNode;
  label?: string;
  size?: number;
  tint: string;
  primary?: boolean;
  hapticToken?: HapticToken;
  onClick?: () => void;
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
        onClick={onClick}
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
        borderRadius: size / 2.8,
        color: c,
        background: `${c}18`,
        border: `1px solid ${c}22`,
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
        background: surfaces.glassSoft,
        border: `1px solid ${surfaces.borderSoft}`,
        boxShadow: shadows.soft,
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
          <div style={{ color: colors.textPrimary, fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>
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

/** Floating toast — light card, soft elevation, spring entry, swipe-to-dismiss
 *  (horizontal) and tap-to-dismiss. Stacked and auto-dismissed by ToastHost. */
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
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const start = useRef<number | null>(null);
  const moved = useRef(false);

  const finish = () => {
    if (leaving) return;
    setLeaving(true);
    haptic("light");
    window.setTimeout(onDismiss, 180);
  };

  return (
    <div
      role="status"
      onPointerDown={(e) => {
        start.current = e.clientX;
        moved.current = false;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (start.current == null) return;
        const d = e.clientX - start.current;
        if (Math.abs(d) > 3) moved.current = true;
        setDx(d);
      }}
      onPointerUp={() => {
        if (start.current == null) return;
        start.current = null;
        if (Math.abs(dx) > 96) finish();
        else setDx(0);
      }}
      onClick={() => {
        if (!moved.current) finish();
      }}
      className="ds-toast-in flex items-center gap-2.5"
      style={{
        borderRadius: radii.pill,
        padding: "8px 18px 8px 8px",
        background: surfaces.glassSoft,
        border: `1px solid ${surfaces.borderSoft}`,
        boxShadow: shadows.large,
        cursor: "pointer",
        touchAction: "pan-y",
        transform: `translateX(${dx}px)`,
        opacity: leaving ? 0 : Math.max(0, 1 - Math.abs(dx) / 200),
        transition: start.current == null ? "transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s ease" : "none",
      }}
    >
      <FeedbackIcon tone={tone} icon={icon} size={30} />
      <span style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>
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
      className="ds-feedback flex items-center gap-3"
      style={{
        borderRadius: radii.md,
        padding: "10px 12px 10px 14px",
        background: `${c}12`,
        border: `1px solid ${c}22`,
        boxShadow: "none",
      }}
    >
      <span aria-hidden style={{ color: c, display: "flex" }}>
        {icon}
      </span>
      <span className="min-w-0 flex-1" style={{ color: colors.textPrimary, fontSize: 13.5, fontWeight: 600 }}>
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

/** Confirmation dialog — centered, scrim-dimmed, spring-expands in. One clear
 *  primary action; destructive intent uses the danger button. */
function ConfirmDialog({
  open,
  tone = "default",
  icon,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  tone?: "default" | "danger";
  icon?: React.ReactNode;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  if (!open) return null;
  const accent = tone === "danger" ? colors.danger : colors.primary;
  return (
    <div
      className="ds-scrim-in fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 90, padding: 24, background: "rgba(20,20,25,0.28)", backdropFilter: "blur(3px)" }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="ds-dialog-in w-full"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 320,
          borderRadius: radii.xl,
          padding: `${spacing[6]}px ${spacing[5]}px ${spacing[4]}px`,
          background: surfaces.glassSoft,
          border: `1px solid ${surfaces.borderSoft}`,
          boxShadow: shadows.large,
          textAlign: "center",
        }}
      >
        {icon != null && (
          <div
            className="mx-auto flex items-center justify-center"
            style={{
              width: 52,
              height: 52,
              borderRadius: radii.lg,
              background: `${accent}14`,
              color: accent,
              marginBottom: spacing[3],
            }}
          >
            {icon}
          </div>
        )}
        <Text variant="headingSm" align="center">{title}</Text>
        {body != null && (
          <Text variant="body" tone="secondary" align="center" style={{ marginTop: spacing[1] }}>
            {body}
          </Text>
        )}
        <div className="flex flex-col" style={{ gap: spacing[2], marginTop: spacing[5] }}>
          <Button fullWidth variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button fullWidth variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Bottom action bar — sticky, thumb-reachable primary action(s) with a
 *  hairline top edge and safe-area padding. Slides up from the bottom. */
function BottomActionBar({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("ds-actionbar-in flex items-center", className)}
      style={{
        gap: spacing[2],
        padding: `${spacing[3]}px ${spacing[4]}px calc(${spacing[3]}px + env(safe-area-inset-bottom))`,
        background: "rgba(255,255,255,0.86)",
        backdropFilter: "blur(20px)",
        borderTop: `1px solid ${surfaces.borderSoft}`,
        ...style,
      }}
    >
      {children}
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
  const color = state === "read" ? colors.primary : colors.textMuted;
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
            color: isMine ? "#ffffff" : colors.textPrimary,
            background: isMine ? gradients.primaryButton : surfaces.glassSoft,
            border: `1px solid ${isMine ? "transparent" : surfaces.borderSoft}`,
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
              background: surfaces.glassSoft,
              border: `1px solid ${surfaces.borderSoft}`,
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
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(20px)",
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
        <div style={{ ...type.titleMd, color: colors.textPrimary }} className="truncate">
          Ana Rivera
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="rounded-full"
            style={{ width: 7, height: 7, background: colors.success }}
          />
          <span style={{ ...type.caption, color: colors.success }}>Active now</span>
        </div>
      </div>
      <button
        aria-label="Voice call"
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{ width: 40, height: 40, color: colors.primary, background: "rgba(120,120,128,0.10)", border: `1px solid ${surfaces.borderSoft}` }}
      >
        <Phone style={{ width: 18, height: 18 }} />
      </button>
      <button
        aria-label="Video call"
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{ width: 40, height: 40, color: colors.primary, background: "rgba(120,120,128,0.10)", border: `1px solid ${surfaces.borderSoft}` }}
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
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(20px)",
      }}
    >
      <ComposerAction icon={<Plus style={{ width: 22, height: 22 }} />} label="Attachments" />
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
// Navigation config — the reusable system lives in @/components/ds/navigation
// ---------------------------------------------------------------------------

const NAV_ITEMS: BottomNavItem[] = [
  { icon: (p) => <Home {...p} />, label: "Home" },
  { icon: (p) => <Search {...p} />, label: "Search" },
  { icon: (p) => <Heart {...p} />, label: "Likes", badge: 5 },
  { icon: (p) => <MessageCircle {...p} />, label: "Chats", badge: 2 },
  { icon: (p) => <User {...p} />, label: "Profile" },
];


