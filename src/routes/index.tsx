import { createFileRoute } from "@tanstack/react-router";
import {
  Heart,
  X,
  Star,
  GraduationCap,
  BookOpen,
  Users,
  Home as HomeIcon,
  Search,
  MessageCircle,
  User,
} from "lucide-react";

import profile1 from "@/assets/profile1.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

const INK = "#1c1c1e";
const INK_SOFT = "rgba(60,60,67,0.72)";
const INK_MUTED = "rgba(60,60,67,0.5)";
const HAIRLINE = "rgba(0,0,0,0.08)";
const SURFACE = "#f1f2f4";
const ACCENT = "#0a84ff";

const interests = ["Photography", "Indie music", "Coffee", "Trail running", "Design"];
const shared = ["Design Club", "Film Society"];

function Index() {
  return (
    <main
      className="relative flex min-h-screen w-full justify-center"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", ui-sans-serif, system-ui, sans-serif',
        color: INK,
        background:
          "linear-gradient(180deg, #f8f8f7 0%, #f6f7f9 52%, #f4f5f7 100%)",
      }}
    >
      <div
        className="flex w-full flex-col"
        style={{ maxWidth: 440, padding: "20px 20px 108px" }}
      >
        {/* Top bar — large title, calm */}
        <header
          className="flex items-center justify-between"
          style={{ marginBottom: 20 }}
        >
          <div>
            <p style={{ color: INK_MUTED, fontSize: 13, fontWeight: 600 }}>
              Northgate University
            </p>
            <h1
              style={{
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
                marginTop: 2,
              }}
            >
              Discover
            </h1>
          </div>
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 40,
              height: 40,
              background: "#fff",
              border: `1px solid ${HAIRLINE}`,
            }}
          >
            <User size={20} color={INK_SOFT} strokeWidth={2} />
          </div>
        </header>

        {/* Profile card — photo is the hero */}
        <article
          className="overflow-hidden"
          style={{
            background: "#fff",
            borderRadius: 28,
            border: `1px solid ${HAIRLINE}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.07)",
          }}
        >
          {/* Photo */}
          <div className="relative" style={{ aspectRatio: "4 / 5" }}>
            <img
              src={profile1}
              alt="Mila, Design student at Northgate University"
              width={1024}
              height={1280}
              className="h-full w-full object-cover"
            />
            {/* subtle mutual-college badge */}
            <div
              className="absolute flex items-center"
              style={{
                top: 14,
                left: 14,
                gap: 6,
                padding: "6px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(8px)",
                fontSize: 12,
                fontWeight: 600,
                color: INK,
              }}
            >
              <GraduationCap size={14} color={ACCENT} strokeWidth={2.2} />
              Same college
            </div>
          </div>

          {/* Identity block */}
          <div style={{ padding: "20px 20px 4px" }}>
            <div className="flex items-baseline" style={{ gap: 8 }}>
              <h2
                style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}
              >
                Mila
              </h2>
              <span style={{ fontSize: 20, fontWeight: 500, color: INK_MUTED }}>
                21
              </span>
            </div>

            {/* College meta */}
            <div
              className="flex flex-col"
              style={{ gap: 8, marginTop: 12 }}
            >
              <MetaRow icon={<GraduationCap size={16} />} text="Northgate University" />
              <MetaRow icon={<BookOpen size={16} />} text="Design · 5th semester" />
              <MetaRow
                icon={<Users size={16} />}
                text={`${shared.length} shared clubs`}
              />
            </div>

            {/* Bio */}
            <p
              style={{
                marginTop: 16,
                fontSize: 15,
                lineHeight: 1.55,
                color: INK_SOFT,
              }}
            >
              Studio late nights, campus coffee runs and weekend hikes. Looking for
              someone to explore the city with.
            </p>

            {/* Interests */}
            <div
              className="flex flex-wrap"
              style={{ gap: 8, marginTop: 16, marginBottom: 16 }}
            >
              {interests.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 999,
                    background: SURFACE,
                    fontSize: 13,
                    fontWeight: 500,
                    color: INK,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </article>

        {/* Swipe actions */}
        <div
          className="flex items-center justify-center"
          style={{ gap: 20, marginTop: 24 }}
        >
          <CircleAction size={58} label="Pass">
            <X size={26} color={INK_SOFT} strokeWidth={2.4} />
          </CircleAction>
          <CircleAction size={70} label="Like" primary>
            <Heart size={30} color="#fff" strokeWidth={2.4} fill="#fff" />
          </CircleAction>
          <CircleAction size={58} label="Super like">
            <Star size={24} color="#ff9f0a" strokeWidth={2.2} fill="#ff9f0a" />
          </CircleAction>
        </div>
      </div>

      {/* Bottom navigation — quiet floating surface */}
      <nav
        className="fixed left-1/2 flex -translate-x-1/2 items-center"
        style={{
          bottom: 20,
          gap: 4,
          padding: 6,
          borderRadius: 999,
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(16px)",
          border: `1px solid ${HAIRLINE}`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <NavItem icon={<HomeIcon size={22} />} active />
        <NavItem icon={<Search size={22} />} />
        <NavItem icon={<MessageCircle size={22} />} />
        <NavItem icon={<User size={22} />} />
      </nav>
    </main>
  );
}

function MetaRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center" style={{ gap: 10, color: INK_SOFT }}>
      <span style={{ color: INK_MUTED, display: "inline-flex" }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 500 }}>{text}</span>
    </div>
  );
}

function CircleAction({
  children,
  label,
  size,
  primary = false,
}: {
  children: React.ReactNode;
  label: string;
  size: number;
  primary?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className="flex items-center justify-center rounded-full transition-all duration-200 will-change-transform hover:-translate-y-0.5 active:scale-95"
      style={{
        width: size,
        height: size,
        background: primary ? ACCENT : "#fff",
        border: `1px solid ${primary ? ACCENT : HAIRLINE}`,
        boxShadow: primary
          ? "0 4px 14px rgba(10,132,255,0.28)"
          : "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {children}
    </button>
  );
}

function NavItem({
  icon,
  active = false,
}: {
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      className="flex items-center justify-center rounded-full transition-colors duration-200"
      style={{
        width: 48,
        height: 48,
        color: active ? ACCENT : INK_MUTED,
        background: active ? "rgba(10,132,255,0.10)" : "transparent",
      }}
    >
      {icon}
    </button>
  );
}
