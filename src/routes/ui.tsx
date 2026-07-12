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
  Send,
  Plus,
  Camera,
  ImageOff,
  Flame,
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
    <section style={{ marginBottom: spacing[9] }}>
      <h2
        className="text-white"
        style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}
      >
        {title}
      </h2>
      <p style={{ color: colors.textSecondary, fontSize: 15, marginTop: 4 }}>
        {description}
      </p>
      <div style={{ marginTop: spacing[4] }}>{children}</div>
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
          maxWidth: 1120,
          padding: `${spacing[8]}px ${spacing[3]}px ${spacing[10]}px`,
        }}
      >
        {/* Hero */}
        <header style={{ marginBottom: spacing[9] }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
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
              maxWidth: 620,
              marginTop: 12,
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
          description="Nunito across the board. Distinct weights build the full hierarchy."
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
          description="Five sizes, status dots, story rings and stacked groups."
        >
          <div className="space-y-4">
            <Row>
              <Avatar src={ana} size="xs" />
              <Avatar src={memoji1} size="sm" status="online" />
              <Avatar src={memoji2} size="md" status="away" />
              <Avatar src={memoji3} size="lg" status="offline" />
              <Avatar src={memoji4} size="xl" ring />
            </Row>
            <div>
              <Label>Stacked group</Label>
              <div className="flex">
                {avatars.map((src, i) => (
                  <div key={i} style={{ marginLeft: i === 0 ? 0 : -14 }}>
                    <Avatar src={src} size="md" />
                  </div>
                ))}
                <div
                  className="flex items-center justify-center rounded-full text-white"
                  style={{
                    marginLeft: -14,
                    width: 52,
                    height: 52,
                    fontSize: 14,
                    fontWeight: 700,
                    background: surfaces.glassSoft,
                    border: "2px solid rgba(255,255,255,0.92)",
                  }}
                >
                  +9
                </div>
              </div>
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

        {/* Swipe controls */}
        <Section
          title="Swipe Controls"
          description="Floating gesture buttons and stamps for the deck."
        >
          <div className="flex items-center" style={{ gap: spacing[4] }}>
            <IconButton size={58} style={{ color: colors.danger }}>
              <X style={{ width: 26, height: 26 }} strokeWidth={2.6} />
            </IconButton>
            <IconButton size={52} style={{ color: colors.info }}>
              <Star style={{ width: 22, height: 22 }} />
            </IconButton>
            <IconButton size={64} primary style={{ boxShadow: shadows.glow }}>
              <Heart style={{ width: 30, height: 30 }} fill="#fff" />
            </IconButton>
            <IconButton size={52} style={{ color: colors.warning }}>
              <Flame style={{ width: 22, height: 22 }} />
            </IconButton>
          </div>
          <Row>
            <Stamp label="LIKE" color={colors.success} rotate={-12} />
            <Stamp label="NOPE" color={colors.danger} rotate={12} />
            <Stamp label="SUPER" color={colors.info} rotate={-6} />
          </Row>
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
        <Section title="Chat" description="Message bubbles, typing indicator and receipts.">
          <GlassPanel style={{ padding: spacing[5] }}>
            <div className="flex flex-col gap-3">
              <Bubble mine={false}>Hey! Saw we're both in CS 👋</Bubble>
              <Bubble mine>No way, what year are you?</Bubble>
              <Bubble mine={false}>Second year. Coffee this week?</Bubble>
              <div className="flex items-center gap-1.5" style={{ paddingLeft: 4 }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="rounded-full"
                    style={{
                      width: 8,
                      height: 8,
                      background: colors.textMuted,
                      animation: `ds-typing 1.2s ${i * 0.15}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
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
            <GlassPanel style={{ padding: "14px 20px" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar src={ana} size="sm" />
                  <span style={{ color: "#fff", fontWeight: 700 }}>Discover</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconButton size={40}><Search style={{ width: 18, height: 18 }} /></IconButton>
                  <IconButton size={40}><Bell style={{ width: 18, height: 18 }} /></IconButton>
                </div>
              </div>
            </GlassPanel>
            <GlassPanel style={{ padding: "10px 8px" }}>
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

function SwipeCard() {
  return (
    <GlassPanel style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ position: "relative", height: 260 }}>
        <img src={memoji5} alt="Profile" className="h-full w-full object-cover" />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, transparent 40%, rgba(4,8,20,0.9) 100%)",
          }}
        />
        <div style={{ position: "absolute", left: 16, bottom: 14, right: 16 }}>
          <div className="flex items-center gap-2">
            <span style={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>Jordan, 20</span>
            <Badge tone="success"><ShieldCheck style={{ width: 12, height: 12 }} /></Badge>
          </div>
          <div className="mt-1 flex items-center gap-1" style={{ color: colors.textSecondary, fontSize: 13 }}>
            <MapPin style={{ width: 13, height: 13 }} /> Design · 2km away
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-4" style={{ padding: "14px" }}>
        <IconButton size={48} style={{ color: colors.danger }}>
          <X style={{ width: 22, height: 22 }} strokeWidth={2.6} />
        </IconButton>
        <IconButton size={56} primary style={{ boxShadow: shadows.glow }}>
          <Heart style={{ width: 26, height: 26 }} fill="#fff" />
        </IconButton>
        <IconButton size={48} style={{ color: colors.info }}>
          <Star style={{ width: 22, height: 22 }} />
        </IconButton>
      </div>
    </GlassPanel>
  );
}

function Stamp({ label, color, rotate }: { label: string; color: string; rotate: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        transform: `rotate(${rotate}deg)`,
        padding: "6px 16px",
        borderRadius: radii.sm,
        border: `3px solid ${color}`,
        color,
        fontSize: 22,
        fontWeight: 900,
        letterSpacing: "0.06em",
        textShadow: `0 0 20px ${color}`,
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

function Bubble({ children, mine }: { children: React.ReactNode; mine?: boolean }) {
  return (
    <div className="flex" style={{ justifyContent: mine ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "78%",
          padding: "10px 16px",
          borderRadius: radii.lg,
          borderBottomRightRadius: mine ? 6 : radii.lg,
          borderBottomLeftRadius: mine ? radii.lg : 6,
          fontSize: 15,
          fontWeight: 500,
          color: "#fff",
          background: mine ? gradients.primaryButton : surfaces.glassSoft,
          border: `1px solid ${mine ? surfaces.borderStrong : surfaces.border}`,
          boxShadow: mine ? shadows.primaryGlow : "none",
        }}
      >
        {children}
      </div>
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
