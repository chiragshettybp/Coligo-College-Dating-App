import { Link } from "@tanstack/react-router";
import { Mail, Instagram, Twitter, Linkedin } from "lucide-react";

import { Text } from "@/components/ds/glass";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { colors, radii, spacing, surfaces } from "@/lib/ds";
import chiragAvatar from "@/assets/chirag-avatar.png.asset.json";

const LEGAL_LINKS = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/community-guidelines", label: "Community Guidelines" },
] as const;

const COMPANY_LINKS = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

const SOCIALS = [
  { label: "Instagram", Icon: Instagram },
  { label: "Twitter", Icon: Twitter },
  { label: "LinkedIn", Icon: Linkedin },
] as const;

const SUPPORT_EMAIL = "support@collegedating.app";

function FooterLink({ to, label }: { to: string; label: string }) {
  return (
    <li>
      <Link
        to={to}
        style={{
          color: colors.textSecondary,
          textDecoration: "none",
          fontSize: 15,
          fontWeight: 500,
        }}
      >
        {label}
      </Link>
    </li>
  );
}

export function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      style={{
        borderTop: `1px solid ${surfaces.border}`,
        background: "rgba(255,255,255,0.5)",
        marginTop: spacing[9],
      }}
    >
      <div
        className="mx-auto"
        style={{ maxWidth: 1120, padding: `${spacing[8]}px ${spacing[4]}px ${spacing[5]}px` }}
      >
        <div
          className="grid gap-8"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
        >
          {/* Brand + contact */}
          <div>
            <BrandLogo size={30} wordmarkVariant="title" eager />

            <Text variant="bodySm" tone="secondary" style={{ marginTop: spacing[2], maxWidth: 260 }}>
              The verified dating community made exclusively for college students in India.
            </Text>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center"
              style={{
                gap: spacing[0],
                marginTop: spacing[3],
                color: colors.primary,
                textDecoration: "none",
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              <Mail style={{ width: 16, height: 16 }} />
              {SUPPORT_EMAIL}
            </a>
          </div>

          {/* Company */}
          <div>
            <Text variant="overline" tone="muted">
              Company
            </Text>
            <ul
              style={{
                listStyle: "none",
                margin: `${spacing[2]}px 0 0`,
                padding: 0,
                display: "grid",
                gap: spacing[1],
              }}
            >
              {COMPANY_LINKS.map((l) => (
                <FooterLink key={l.to} {...l} />
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <Text variant="overline" tone="muted">
              Legal
            </Text>
            <ul
              style={{
                listStyle: "none",
                margin: `${spacing[2]}px 0 0`,
                padding: 0,
                display: "grid",
                gap: spacing[1],
              }}
            >
              {LEGAL_LINKS.map((l) => (
                <FooterLink key={l.to} {...l} />
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <Text variant="overline" tone="muted">
              Follow
            </Text>
            <div style={{ display: "flex", gap: spacing[1], marginTop: spacing[2] }}>
              {SOCIALS.map(({ label, Icon }) => (
                <span
                  key={label}
                  role="img"
                  aria-label={`${label} (coming soon)`}
                  title={`${label} — coming soon`}
                  className="inline-flex items-center justify-center"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radii.md,
                    background: surfaces.glassSoft,
                    border: `1px solid ${surfaces.border}`,
                    color: colors.textSecondary,
                  }}
                >
                  <Icon style={{ width: 18, height: 18 }} />
                </span>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: spacing[6],
            paddingTop: spacing[4],
            borderTop: `1px solid ${surfaces.borderSoft}`,
          }}
        >
          <div className="flex flex-wrap items-center justify-between" style={{ gap: spacing[2] }}>
            <Text variant="caption" tone="muted">
              © {year} Coligo. All rights reserved. Made for verified college students in India.
            </Text>
            <a
              href="https://chiragbp-doc.lovable.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="ds-press inline-flex items-center"
              style={{ 
                gap: spacing[2], 
                textDecoration: "none",
                background: "transparent"
              }}
            >
              <img 
                src={chiragAvatar.url}
                alt=""
                style={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `1px solid ${surfaces.border}`
                }}
              />
              <Text variant="caption" tone="muted">
                Built by
              </Text>
              <Text variant="caption" color={colors.primary} style={{ fontWeight: 600, marginLeft: 4 }}>
                Chirag
              </Text>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
