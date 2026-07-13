// ============================================================================
// AdminShell — the single, shared navigation surface for every /admin/* route.
// Data-driven nav, permission-aware, realtime badges, collapsible desktop rail,
// mobile drawer with backdrop + body-scroll lock, Cmd/Ctrl+K search, breadcrumbs
// and a bottom admin panel with logout. Compose it once in the /admin layout;
// never rebuild admin navigation inside a page.
// ============================================================================
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Flag,
  Heart,
  MessagesSquare,
  BarChart3,
  Settings as SettingsIcon,
  ScrollText,
  Search as SearchIcon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  adminGuardQuery,
  adminStatsQuery,
  adminProfileQuery,
  logAdminAction,
} from "@/lib/admin.functions";
import { useAdminRealtime } from "@/lib/use-admin-realtime";
import { Text, Badge, Skeleton, Avatar } from "@/components/ds/glass";
import { colors, radii, spacing, surfaces, shadows, gradients, weights } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

// --------------------------------------------------------------- nav model
type BadgeKey = "reports" | "chats" | "users";
type NavItem = {
  key: string;
  label: string;
  to: string;
  icon: (p: { size?: number }) => ReactNode;
  badge?: BadgeKey;
  /** roles allowed to see this item (future permission gating). */
  roles?: string[];
};

// Data-driven so future modules drop in without redesign.
const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", to: "/admin/dashboard", icon: (p) => <LayoutDashboard size={p.size} /> },
  { key: "users", label: "Users", to: "/admin/users", icon: (p) => <Users size={p.size} />, badge: "users" },
  { key: "colleges", label: "Colleges", to: "/admin/colleges", icon: (p) => <GraduationCap size={p.size} /> },
  { key: "reports", label: "Reports", to: "/admin/reports", icon: (p) => <Flag size={p.size} />, badge: "reports" },
  { key: "matches", label: "Matches", to: "/admin/matches", icon: (p) => <Heart size={p.size} /> },
  { key: "chats", label: "Chats", to: "/admin/chats", icon: (p) => <MessagesSquare size={p.size} />, badge: "chats" },
  { key: "analytics", label: "Analytics", to: "/admin/analytics", icon: (p) => <BarChart3 size={p.size} />, roles: ["admin"] },
  { key: "settings", label: "Settings", to: "/admin/settings", icon: (p) => <SettingsIcon size={p.size} />, roles: ["admin"] },
  { key: "logs", label: "Logs", to: "/admin/logs", icon: (p) => <ScrollText size={p.size} />, roles: ["admin"] },
];

const RAIL_EXPANDED = 264;
const RAIL_COLLAPSED = 76;
const COLLAPSE_KEY = "coligo.admin.sidebar.collapsed";

// ---------------------------------------------------------- small hooks
function useIsDesktop() {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return desktop;
}

function labelFor(seg: string) {
  const found = NAV_ITEMS.find((n) => n.to.endsWith(seg));
  if (found) return found.label;
  return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
}

// ============================================================ AdminShell
export function AdminShell({ children }: { children: ReactNode }) {
  const { data: allowed, isLoading: guardLoading } = useQuery(adminGuardQuery());

  // Keep the whole admin surface live regardless of the current page.
  useAdminRealtime(Boolean(allowed));

  // Non-admins (or the brief guard-loading window) get no chrome — the child
  // route owns its skeleton and the redirect-to-login.
  if (!allowed) {
    return (
      <>
        {guardLoading ? null : null}
        {children}
      </>
    );
  }
  return <Shell>{children}</Shell>;
}

function Shell({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore persisted collapse preference (desktop only).
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);
  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const railWidth = collapsed ? RAIL_COLLAPSED : RAIL_EXPANDED;

  // Breadcrumbs from the current path.
  const crumbs = useMemo(() => {
    const segs = pathname.split("/").filter(Boolean); // ["admin", ...]
    const rest = segs.slice(1);
    const acc: { label: string; to: string }[] = [];
    let path = "/admin";
    for (const seg of rest) {
      path += `/${seg}`;
      // Skip opaque ids in the label but keep them navigable via their parent.
      const isId = /^[0-9a-f-]{8,}$/i.test(seg);
      acc.push({ label: isId ? "Details" : labelFor(seg), to: path });
    }
    return acc;
  }, [pathname]);

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      {/* Desktop permanent rail */}
      {isDesktop ? (
        <aside
          style={{
            width: railWidth,
            flexShrink: 0,
            transition: "width 220ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div style={{ position: "fixed", top: 0, bottom: 0, left: 0, width: railWidth, transition: "width 220ms cubic-bezier(0.22,1,0.36,1)", zIndex: 30 }}>
            <SidebarBody collapsed={collapsed} onToggleCollapse={toggleCollapse} pathname={pathname} onNavigate={() => {}} />
          </div>
        </aside>
      ) : null}

      {/* Mobile drawer + backdrop */}
      {!isDesktop && mobileOpen ? (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{ position: "fixed", inset: 0, background: surfaces.overlay, zIndex: 40, backdropFilter: "blur(2px)" }}
            aria-hidden
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              bottom: 0,
              left: 0,
              width: Math.min(RAIL_EXPANDED, typeof window !== "undefined" ? window.innerWidth - 48 : RAIL_EXPANDED),
              zIndex: 50,
              animation: "adminDrawerIn 240ms cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <SidebarBody
              collapsed={false}
              onToggleCollapse={() => setMobileOpen(false)}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
              closeIcon
            />
          </div>
          <style>{`@keyframes adminDrawerIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}`}</style>
        </>
      ) : null}

      {/* Main column */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <MobileHeader isDesktop={isDesktop} crumbs={crumbs} onOpen={() => setMobileOpen(true)} />
        <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}

// -------------------------------------------------------- top header (mobile)
function MobileHeader({
  isDesktop,
  crumbs,
  onOpen,
}: {
  isDesktop: boolean;
  crumbs: { label: string; to: string }[];
  onOpen: () => void;
}) {
  if (isDesktop) {
    // Desktop shows only breadcrumbs (the rail owns the rest).
    return (
      <div style={{ padding: `${spacing[2]}px ${spacing[4]}px 0` }}>
        <Breadcrumbs crumbs={crumbs} />
      </div>
    );
  }
  return (
    <header
      className="flex items-center"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        gap: spacing[2],
        padding: `${spacing[1]}px ${spacing[3]}px`,
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        borderBottom: `1px solid ${surfaces.borderSoft}`,
      }}
    >
      <button
        onClick={() => {
          haptic("light");
          onOpen();
        }}
        aria-label="Open navigation menu"
        className="ds-press flex items-center justify-center rounded-full"
        style={{ width: 44, height: 44, background: "transparent", border: "none", color: colors.textPrimary, flexShrink: 0 }}
      >
        <Menu size={22} />
      </button>
      <div style={{ minWidth: 0, flex: 1 }}>
        <Breadcrumbs crumbs={crumbs} compact />
      </div>
    </header>
  );
}

function Breadcrumbs({ crumbs, compact }: { crumbs: { label: string; to: string }[]; compact?: boolean }) {
  const trail = compact ? crumbs.slice(-2) : crumbs;
  return (
    <nav aria-label="Breadcrumb" className="flex items-center" style={{ gap: 6, overflow: "hidden" }}>
      <Link to="/admin/dashboard" style={{ ...crumbStyle(false), flexShrink: 0 }}>
        Admin
      </Link>
      {trail.map((c, i) => (
        <span key={c.to} className="flex items-center" style={{ gap: 6, minWidth: 0 }}>
          <ChevronRight size={13} style={{ color: colors.textMuted, flexShrink: 0 }} />
          {i === trail.length - 1 ? (
            <span className="truncate" style={crumbStyle(true)}>
              {c.label}
            </span>
          ) : (
            <Link to={c.to} className="truncate" style={crumbStyle(false)}>
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

function crumbStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 13,
    fontWeight: active ? weights.semibold : weights.medium,
    color: active ? colors.textPrimary : colors.textSecondary,
    textDecoration: "none",
  };
}

// ---------------------------------------------------------------- sidebar body
function SidebarBody({
  collapsed,
  onToggleCollapse,
  pathname,
  onNavigate,
  closeIcon,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  pathname: string;
  onNavigate: () => void;
  closeIcon?: boolean;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const stats = useQuery(adminStatsQuery());
  const profile = useQuery(adminProfileQuery());
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+K focuses search.
  useEffect(() => {
    if (collapsed) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapsed]);

  const role = profile.data?.role ?? "admin";
  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((n) => !n.roles || n.roles.includes(role)),
    [role],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibleItems;
    return visibleItems.filter((n) => n.label.toLowerCase().includes(q));
  }, [query, visibleItems]);

  const badges: Record<BadgeKey, number> = {
    reports: stats.data?.reportsPending ?? 0,
    chats: stats.data?.totalConversations ?? 0,
    users: stats.data?.newToday ?? 0,
  };

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  const onLogout = async () => {
    haptic("light");
    try {
      await logAdminAction({ data: { action: "admin_logout" } });
    } catch {
      /* ignore */
    }
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut(); // disconnects realtime channels on the client
    navigate({ to: "/admin/login", replace: true });
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(24px) saturate(170%)",
        WebkitBackdropFilter: "blur(24px) saturate(170%)",
        borderRight: `1px solid ${surfaces.border}`,
        boxShadow: shadows.soft,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center"
        style={{ gap: spacing[2], padding: collapsed ? `${spacing[3]}px 0` : spacing[3], justifyContent: collapsed ? "center" : "space-between", borderBottom: `1px solid ${surfaces.borderSoft}` }}
      >
        <Link
          to="/admin/dashboard"
          onClick={onNavigate}
          className="flex items-center"
          style={{ gap: 10, textDecoration: "none", minWidth: 0 }}
          aria-label="Coligo Admin — go to dashboard"
        >
          <span
            className="flex items-center justify-center"
            style={{ width: 36, height: 36, borderRadius: radii.sm, background: gradients.primaryButton, color: "#fff", fontWeight: weights.bold, flexShrink: 0, boxShadow: shadows.primaryGlow }}
          >
            C
          </span>
          {!collapsed ? (
            <span style={{ minWidth: 0 }}>
              <span className="truncate" style={{ display: "block", ...{ fontSize: 15, fontWeight: weights.bold, color: colors.textPrimary } }}>
                Coligo Admin
              </span>
              <span style={{ fontSize: 11, color: colors.textMuted }}>
                v{profile.data?.appVersion ?? "—"}
              </span>
            </span>
          ) : null}
        </Link>
        {!collapsed ? (
          <button
            onClick={() => {
              haptic("light");
              onToggleCollapse();
            }}
            aria-label={closeIcon ? "Close menu" : "Collapse sidebar"}
            className="ds-press flex items-center justify-center rounded-full"
            style={{ width: 32, height: 32, background: "transparent", border: "none", color: colors.textSecondary, flexShrink: 0 }}
          >
            {closeIcon ? <X size={18} /> : <ChevronLeft size={18} />}
          </button>
        ) : null}
      </div>

      {/* Search (hidden when collapsed) */}
      {!collapsed ? (
        <div style={{ padding: spacing[3], paddingBottom: spacing[2] }}>
          <label className="flex items-center" style={{ gap: 8, padding: "9px 12px", borderRadius: radii.md, background: "rgba(120,120,128,0.1)", border: `1px solid ${surfaces.borderSoft}` }}>
            <SearchIcon size={16} style={{ color: colors.textMuted, flexShrink: 0 }} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              aria-label="Search navigation"
              style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 14, color: colors.textPrimary }}
            />
            <kbd style={{ fontSize: 10, color: colors.textMuted, background: surfaces.glassSoft, border: `1px solid ${surfaces.borderSoft}`, borderRadius: 6, padding: "1px 5px", flexShrink: 0 }}>⌘K</kbd>
          </label>
        </div>
      ) : null}

      {/* Nav */}
      <nav aria-label="Admin sections" style={{ flex: 1, overflowY: "auto", padding: `${spacing[1]}px ${collapsed ? 8 : spacing[2]}px` }}>
        <ul style={{ display: "flex", flexDirection: "column", gap: 3, listStyle: "none", margin: 0, padding: 0 }}>
          {filtered.map((item) => {
            const active = isActive(item.to);
            const count = item.badge ? badges[item.badge] : 0;
            return (
              <li key={item.key}>
                <Link
                  to={item.to}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className="ds-press flex items-center"
                  style={{
                    position: "relative",
                    gap: 12,
                    padding: collapsed ? "11px 0" : "10px 12px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    borderRadius: radii.md,
                    textDecoration: "none",
                    color: active ? "#fff" : colors.textSecondary,
                    background: active ? gradients.primaryButton : "transparent",
                    boxShadow: active ? shadows.primaryGlow : "none",
                    fontWeight: active ? weights.semibold : weights.medium,
                    fontSize: 14.5,
                    transition: "background 140ms ease, color 140ms ease",
                  }}
                >
                  <span style={{ position: "relative", display: "flex", flexShrink: 0 }}>
                    {item.icon({ size: 19 })}
                    {count > 0 && collapsed ? (
                      <span style={dotBadge} aria-hidden />
                    ) : null}
                  </span>
                  {!collapsed ? (
                    <span className="truncate" style={{ flex: 1 }}>
                      {item.label}
                    </span>
                  ) : null}
                  {!collapsed && count > 0 ? (
                    <Badge tone={active ? "neutral" : item.badge === "reports" ? "danger" : "info"}>
                      {count > 99 ? "99+" : count}
                    </Badge>
                  ) : null}
                </Link>
              </li>
            );
          })}
          {!collapsed && filtered.length === 0 ? (
            <li style={{ padding: "10px 12px" }}>
              <Text variant="caption" tone="muted">
                No sections match “{query}”.
              </Text>
            </li>
          ) : null}
        </ul>
      </nav>

      {/* Collapse toggle when collapsed */}
      {collapsed ? (
        <button
          onClick={() => {
            haptic("light");
            onToggleCollapse();
          }}
          aria-label="Expand sidebar"
          className="ds-press flex items-center justify-center"
          style={{ margin: "0 auto 8px", width: 36, height: 36, borderRadius: radii.md, background: "transparent", border: "none", color: colors.textSecondary }}
        >
          <ChevronRight size={18} />
        </button>
      ) : null}

      {/* User panel */}
      <div style={{ borderTop: `1px solid ${surfaces.borderSoft}`, padding: collapsed ? 8 : spacing[2] }}>
        {profile.isLoading ? (
          <div className="flex items-center" style={{ gap: 10, padding: 8 }}>
            <Skeleton style={{ width: 36, height: 36, borderRadius: 999 }} />
            {!collapsed ? <Skeleton style={{ height: 14, flex: 1 }} /> : null}
          </div>
        ) : (
          <div
            className="flex items-center"
            style={{ gap: 10, padding: collapsed ? 0 : "8px 10px", justifyContent: collapsed ? "center" : "space-between", borderRadius: radii.md }}
          >
            <div className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
              <Avatar
                src={profile.data?.avatarUrl ?? undefined}
                size="sm"
                initials={(profile.data?.name ?? "A").slice(0, 1).toUpperCase()}
                alt={profile.data?.name ?? "Admin"}
              />
              {!collapsed ? (
                <div style={{ minWidth: 0 }}>
                  <Text variant="body" color={colors.textPrimary} truncate style={{ fontWeight: weights.semibold, fontSize: 13.5 }}>
                    {profile.data?.name ?? "Administrator"}
                  </Text>
                  <Text variant="caption" tone="muted" truncate>
                    {profile.data?.phone ?? ""} · {profile.data?.role ?? "admin"}
                  </Text>
                </div>
              ) : null}
            </div>
            {!collapsed ? (
              <button
                onClick={onLogout}
                aria-label="Log out"
                className="ds-press flex items-center justify-center rounded-full"
                style={{ width: 34, height: 34, background: "transparent", border: "none", color: colors.danger, flexShrink: 0 }}
              >
                <LogOut size={17} />
              </button>
            ) : null}
          </div>
        )}
        {collapsed ? (
          <button
            onClick={onLogout}
            aria-label="Log out"
            className="ds-press flex items-center justify-center rounded-full"
            style={{ margin: "6px auto 0", width: 34, height: 34, background: "transparent", border: "none", color: colors.danger }}
          >
            <LogOut size={17} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

const dotBadge: React.CSSProperties = {
  position: "absolute",
  top: -2,
  right: -2,
  width: 9,
  height: 9,
  borderRadius: 999,
  background: colors.accent,
  border: "2px solid #fff",
};

