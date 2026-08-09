import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ds/glass";
import { BrandLogo as BrandMark } from "@/components/brand/BrandLogo";
import { colors, radii, spacing, surfaces, shadows } from "@/lib/ds";
import chiragAvatar from "@/assets/chirag-avatar.png.asset.json";
import { easing, durationMs } from "@/lib/motion";
import { haptic } from "@/lib/haptics";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/community-guidelines", label: "Guidelines" },
  { to: "/contact", label: "Contact" },
] as const;

function BrandLogo() {
  return (
    <Link
      to="/"
      aria-label="Coligo home"
      className="inline-flex items-center"
      style={{ textDecoration: "none" }}
    >
      <BrandMark size={34} wordmarkVariant="headingSm" eager />
    </Link>
  );
}

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close drawer on route change + lock body scroll while open.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: scrolled ? "rgba(248,248,247,0.82)" : "rgba(248,248,247,0.5)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderBottom: `1px solid ${scrolled ? surfaces.border : "transparent"}`,
        transition: `background ${durationMs.standard}ms ${easing.standard}, border-color ${durationMs.standard}ms ${easing.standard}`,
      }}
    >
      <nav
        className="mx-auto flex items-center justify-between"
        style={{
          maxWidth: 1120,
          padding: `${spacing[2]}px ${spacing[4]}px`,
          gap: spacing[3],
        }}
        aria-label="Primary"
      >
        <BrandLogo />

        {/* Desktop links */}
        <ul
          className="hidden items-center md:flex"
          style={{ gap: spacing[1], listStyle: "none", margin: 0, padding: 0 }}
        >
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                activeOptions={{ exact: link.to === "/" }}
                className="inline-flex items-center transition-colors"
                style={{ textDecoration: "none" }}
                activeProps={{
                  style: {
                    color: colors.primary,
                    background: "rgba(10,132,255,0.10)",
                  },
                }}
                inactiveProps={{ style: { color: colors.textSecondary } }}
              >
                {({ isActive }) => (
                  <span
                    style={{
                      display: "inline-flex",
                      padding: `${spacing[1]}px ${spacing[2]}px`,
                      borderRadius: radii.pill,
                      fontSize: 15,
                      fontWeight: 600,
                      color: isActive ? colors.primary : colors.textSecondary,
                      background: isActive ? "rgba(10,132,255,0.10)" : "transparent",
                    }}
                  >
                    {link.label}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTAs */}
        <div className="hidden items-center md:flex" style={{ gap: spacing[2] }}>
          {pathname === "/" && (
            <div className="flex items-center" style={{ gap: spacing[1], marginRight: spacing[2] }}>
              <img 
                src={chiragAvatar.url}
                alt="Chirag"
                style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: "50%", 
                  objectFit: "cover",
                  border: `2px solid ${colors.success}`
                }}
              />
              <span style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>
                Chirag
              </span>
            </div>
          )}
          <Link to="/auth/login" style={{ textDecoration: "none" }}>
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link to="/auth/signup" style={{ textDecoration: "none" }}>
            <Button variant="primary" size="sm" pill>
              Get Started
            </Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="inline-flex items-center justify-center md:hidden"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => {
            haptic("selection");
            setOpen(true);
          }}
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.md,
            background: surfaces.glassSoft,
            border: `1px solid ${surfaces.border}`,
            color: colors.textPrimary,
          }}
        >
          <Menu style={{ width: 22, height: 22 }} />
        </button>
      </nav>

      {/* Mobile drawer */}
      <div
        className="md:hidden"
        aria-hidden={!open}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "absolute",
            inset: 0,
            background: surfaces.overlay,
            opacity: open ? 1 : 0,
            transition: `opacity ${durationMs.standard}ms ${easing.standard}`,
          }}
        />
        <aside
          role="dialog"
          aria-label="Menu"
          aria-modal="true"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            height: "100%",
            width: "min(86%, 340px)",
            background: surfaces.glassSoft,
            borderLeft: `1px solid ${surfaces.border}`,
            boxShadow: shadows.large,
            transform: open ? "translateX(0)" : "translateX(100%)",
            transition: `transform ${durationMs.medium}ms ${easing.easeOut}`,
            padding: spacing[4],
            display: "flex",
            flexDirection: "column",
            gap: spacing[3],
          }}
        >
          <div className="flex items-center justify-between">
            <BrandLogo />
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              style={{
                width: 44,
                height: 44,
                borderRadius: radii.md,
                background: surfaces.glassSoft,
                border: `1px solid ${surfaces.border}`,
                color: colors.textPrimary,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X style={{ width: 22, height: 22 }} />
            </button>
          </div>

          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: spacing[0] }}>
            {NAV_LINKS.map((link) => {
              const isActive =
                link.to === "/" ? pathname === "/" : pathname.startsWith(link.to);
              return (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    onClick={() => setOpen(false)}
                    style={{
                      display: "block",
                      padding: `${spacing[2]}px ${spacing[2]}px`,
                      borderRadius: radii.md,
                      fontSize: 17,
                      fontWeight: 600,
                      textDecoration: "none",
                      color: isActive ? colors.primary : colors.textPrimary,
                      background: isActive ? "rgba(10,132,255,0.10)" : "transparent",
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div style={{ marginTop: "auto", display: "grid", gap: spacing[1] }}>
            <Link to="/auth/login" style={{ textDecoration: "none" }}>
              <Button variant="secondary" fullWidth>
                Log in
              </Button>
            </Link>
            <Link to="/auth/signup" style={{ textDecoration: "none" }}>
              <Button variant="primary" fullWidth>
                Get Started
              </Button>
            </Link>
          </div>
        </aside>
      </div>
    </header>
  );
}
