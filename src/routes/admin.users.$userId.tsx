// ============================================================================
// /admin/users/:userId — full admin view of one user. Real Supabase data via
// admin-gated server functions. Tabbed sections + moderation actions, each with
// an in-page (never popup) confirmation that writes an immutable audit log.
// ============================================================================
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User as UserIcon,
  ShieldCheck,
  Ban,
  PauseCircle,
  RotateCcw,
  Trash2,
  LogOut,
  Radio,
  Flag,
  Smartphone,
  Heart,
  MessageCircle,
  ImageIcon,
  Activity as ActivityIcon,
  CheckCircle2,
  Clock,
} from "lucide-react";

import {
  adminUserDetailQuery,
  adminUserStatsQuery,
  adminUserMatchesQuery,
  adminUserReportsQuery,
  adminUserDevicesQuery,
  adminUserTimelineQuery,
  setAccountStatus,
  setVerification,
  resetDiscovery,
  forceLogout,
  clearReports,
  adminDeleteUser,
  type AdminUserDetail,
} from "@/lib/admin-users.functions";
import { adminGuardQuery } from "@/lib/admin.functions";
import { useAdminRealtime } from "@/lib/use-admin-realtime";
import { Text, Badge, Skeleton, Avatar, Button, Chip } from "@/components/ds/glass";
import { Card, StatCard, SettingsCard, SettingsRow, EmptyStateCard } from "@/components/ds/card";
import { TopBar, ScrollTabs } from "@/components/ds/navigation";
import { Donut } from "@/components/admin/charts";
import { ImageViewer } from "@/components/ds/image-viewer";
import { StatusBadge, VerificationBadge, OnlineDot, initialsOf, timeAgo, prettyGender } from "@/components/admin/user-bits";
import { colors, radii, spacing, surfaces } from "@/lib/ds";

const I = { width: 16, height: 16 } as const;
const TABS = ["Overview", "Statistics", "Activity", "Photos", "Matches", "Reports", "Devices", "Actions"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/admin/users/$userId")({
  head: () => ({
    meta: [
      { title: "User detail — Coligo admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DetailGuard,
  errorComponent: DetailError,
  notFoundComponent: () => <NotFound />,
});

function DetailGuard() {
  const navigate = useNavigate();
  const { data: allowed, isLoading, isError, refetch } = useQuery(adminGuardQuery());
  useEffect(() => {
    if (!isLoading && allowed === false) navigate({ to: "/admin/login", replace: true });
  }, [isLoading, allowed, navigate]);
  if (isLoading) return <DetailSkeleton />;
  if (isError) {
    return (
      <div className="mx-auto text-center" style={{ maxWidth: 420, padding: spacing[6] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Couldn't reach the server</Text>
        <div style={{ marginTop: spacing[4] }}><Button variant="primary" onClick={() => refetch()}>Retry</Button></div>
      </div>
    );
  }
  if (!allowed) return null;
  return <UserDetail />;
}

function UserDetail() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { userId } = Route.useParams();
  const [tab, setTab] = useState<Tab>("Overview");
  useAdminRealtime(true);

  const detail = useQuery(adminUserDetailQuery(userId));

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError) {
    return (
      <Shell onBack={() => navigate({ to: "/admin/users" })}>
        <EmptyStateCard icon={<UserIcon style={{ width: 26, height: 26 }} />} title="Failed to load user" description="Something went wrong. Try again." action={<Button variant="primary" onClick={() => detail.refetch()}>Retry</Button>} />
      </Shell>
    );
  }
  if (!detail.data) {
    return (
      <Shell onBack={() => navigate({ to: "/admin/users" })}>
        <EmptyStateCard icon={<UserIcon style={{ width: 26, height: 26 }} />} title="User not found" description="This account may have been permanently removed or the ID is invalid." action={<Button variant="primary" onClick={() => navigate({ to: "/admin/users" })}>Back to users</Button>} />
      </Shell>
    );
  }

  const u = detail.data;

  return (
    <Shell onBack={() => navigate({ to: "/admin/users" })}>
      {/* Header card */}
      <Card padding={spacing[4]} style={{ marginTop: spacing[4] }}>
        <div className="flex items-center" style={{ gap: spacing[3] }}>
          <Avatar src={u.avatarUrl ?? undefined} size="xl" initials={initialsOf(u.fullName, u.phone)} verified={u.verificationStatus === "verified"} status={u.online ? "online" : undefined} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text variant="headingSm" color={colors.textPrimary} truncate>{u.fullName || "Unnamed"}{u.age ? `, ${u.age}` : ""}</Text>
            <Text variant="caption" tone="muted">{u.phone ?? "—"} · {prettyGender(u.gender)}</Text>
            <div className="flex flex-wrap items-center" style={{ gap: spacing[1], marginTop: spacing[2] }}>
              <StatusBadge status={u.accountStatus} />
              <VerificationBadge status={u.verificationStatus} />
              <OnlineDot online={u.online} />
            </div>
          </div>
        </div>
      </Card>

      <div style={{ marginTop: spacing[3], borderBottom: `1px solid ${surfaces.border}` }}>
        <ScrollTabs options={TABS as unknown as string[]} value={tab} onChange={(v) => setTab(v as Tab)} />
      </div>

      <div style={{ marginTop: spacing[4] }}>
        {tab === "Overview" && <Overview u={u} />}
        {tab === "Statistics" && <Statistics userId={userId} />}
        {tab === "Activity" && <Timeline userId={userId} />}
        {tab === "Photos" && <Photos u={u} />}
        {tab === "Matches" && <Matches userId={userId} />}
        {tab === "Reports" && <Reports userId={userId} />}
        {tab === "Devices" && <Devices userId={userId} />}
        {tab === "Actions" && <Actions u={u} onDone={() => { qc.invalidateQueries({ queryKey: ["admin"] }); }} />}
      </div>
    </Shell>
  );
}

// -------------------------------------------------------------------- Overview
function Overview({ u }: { u: AdminUserDetail }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
      {u.bio && (
        <Card padding={spacing[4]}>
          <Text variant="overline" tone="muted">Bio</Text>
          <Text variant="body" color={colors.textPrimary} style={{ marginTop: spacing[1] }}>{u.bio}</Text>
        </Card>
      )}
      {u.interests.length > 0 && (
        <Card padding={spacing[4]}>
          <Text variant="overline" tone="muted">Interests</Text>
          <div className="flex flex-wrap" style={{ gap: spacing[1], marginTop: spacing[2] }}>
            {u.interests.map((i) => <Badge key={i} tone="neutral">{i}</Badge>)}
          </div>
        </Card>
      )}
      <SettingsCard>
        <Field label="College" value={u.collegeName ?? "—"} />
        <Field label="Department" value={u.departmentName ?? "—"} />
        <Field label="Semester" value={u.semester ? String(u.semester) : "—"} />
        <Field label="Graduation year" value={u.graduationYear ? String(u.graduationYear) : "—"} />
        <Field label="Looking for" value={u.lookingFor ? prettyGender(u.lookingFor) : "—"} />
        <Field label="Profile completion" value={u.onboardingCompleted ? "Completed" : `Step ${u.onboardingStep ?? 0}`} />
      </SettingsCard>
      <Text variant="overline" tone="muted" style={{ marginTop: spacing[2] }}>Account</Text>
      <SettingsCard>
        <Field label="User ID" value={u.id} mono />
        <Field label="Phone" value={u.phone ?? "—"} />
        <Field label="Created" value={new Date(u.createdAt).toLocaleString()} />
        <Field label="Last updated" value={new Date(u.updatedAt).toLocaleString()} />
        <Field label="Last login" value={u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"} />
        <Field label="Discovery" value={u.discoveryEnabled ? "Enabled" : "Disabled"} />
        <Field label="Profile visible" value={u.profileVisible ? "Yes" : "No"} />
        <Field label="Active devices" value={String(u.deviceCount)} />
      </SettingsCard>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <SettingsRow
      title={label}
      trailing={<Text variant="caption" tone="secondary" style={{ maxWidth: 220, textAlign: "right", fontFamily: mono ? "monospace" : undefined, wordBreak: "break-all" }}>{value}</Text>}
    />
  );
}

// ------------------------------------------------------------------ Statistics
function Statistics({ userId }: { userId: string }) {
  const stats = useQuery(adminUserStatsQuery(userId));
  if (stats.isLoading || !stats.data) return <GridSkeleton />;
  const s = stats.data;
  const cards: { label: string; value: number; icon: React.ReactNode }[] = [
    { label: "Total swipes", value: s.totalSwipes, icon: <ActivityIcon style={I} /> },
    { label: "Likes given", value: s.likesGiven, icon: <Heart style={I} /> },
    { label: "Likes received", value: s.likesReceived, icon: <Heart style={I} /> },
    { label: "Passes", value: s.passes, icon: <ActivityIcon style={I} /> },
    { label: "Matches", value: s.matches, icon: <Heart style={I} /> },
    { label: "Unmatches", value: s.unmatches, icon: <ActivityIcon style={I} /> },
    { label: "Messages sent", value: s.messagesSent, icon: <MessageCircle style={I} /> },
    { label: "Media uploaded", value: s.mediaUploaded, icon: <ImageIcon style={I} /> },
    { label: "Reports received", value: s.reportsReceived, icon: <Flag style={I} /> },
    { label: "Reports submitted", value: s.reportsSubmitted, icon: <Flag style={I} /> },
    { label: "Blocks made", value: s.blocksMade, icon: <Ban style={I} /> },
    { label: "Notifications", value: s.notifications, icon: <Radio style={I} /> },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: spacing[3] }}>
        {cards.map((c) => <StatCard key={c.label} label={c.label} value={c.value.toLocaleString()} icon={c.icon} />)}
      </div>
      {(s.likesGiven + s.passes) > 0 && (
        <Donut title="Swipe breakdown" data={[{ name: "Likes", value: s.likesGiven }, { name: "Passes", value: s.passes }]} />
      )}
    </div>
  );
}

// -------------------------------------------------------------------- Timeline
function Timeline({ userId }: { userId: string }) {
  const t = useQuery(adminUserTimelineQuery(userId));
  if (t.isLoading || !t.data) return <GridSkeleton />;
  if (t.data.length === 0) return <EmptyStateCard icon={<Clock style={{ width: 24, height: 24 }} />} title="No activity yet" />;
  return (
    <Card padding={spacing[3]}>
      <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
        {t.data.map((e, i) => (
          <div key={i} className="flex items-center" style={{ gap: spacing[2] }}>
            <span style={{ display: "flex", width: 30, height: 30, borderRadius: 999, alignItems: "center", justifyContent: "center", background: "rgba(120,120,128,0.10)", color: colors.textSecondary, flexShrink: 0 }}>
              <ActivityIcon style={I} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text variant="body" color={colors.textPrimary} truncate>{e.title}</Text>
              <Text variant="caption" tone="muted">{timeAgo(e.ts)}</Text>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ----------------------------------------------------------------------- Photos
function Photos({ u }: { u: AdminUserDetail }) {
  const [open, setOpen] = useState<string | null>(null);
  if (u.photos.length === 0) return <EmptyStateCard icon={<ImageIcon style={{ width: 24, height: 24 }} />} title="No photos uploaded" />;
  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: spacing[2] }}>
        {u.photos.map((p) => (
          <button key={p.id} onClick={() => setOpen(p.path)} style={{ position: "relative", aspectRatio: "3/4", borderRadius: radii.md, overflow: "hidden", border: `1px solid ${surfaces.border}`, cursor: "pointer", padding: 0, background: surfaces.glassSoft }}>
            <img src={p.path} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {p.isPrimary && <span style={{ position: "absolute", top: 6, left: 6 }}><Badge tone="primary">Primary</Badge></span>}
          </button>
        ))}
      </div>
      {open && <ImageViewer src={open} onClose={() => setOpen(null)} />}
    </>
  );
}

// ---------------------------------------------------------------------- Matches
function Matches({ userId }: { userId: string }) {
  const m = useQuery(adminUserMatchesQuery(userId));
  if (m.isLoading || !m.data) return <GridSkeleton />;
  if (m.data.length === 0) return <EmptyStateCard icon={<Heart style={{ width: 24, height: 24 }} />} title="No matches yet" />;
  return (
    <SettingsCard>
      {m.data.map((mt) => (
        <SettingsRow
          key={mt.matchId}
          leading={<Avatar src={mt.other.avatar ?? undefined} size="sm" initials={initialsOf(mt.other.fullName, null)} />}
          title={mt.other.fullName || "User"}
          subtitle={`${mt.messageCount} messages · ${mt.status} · ${timeAgo(mt.createdAt)}`}
          trailing={mt.status === "active" ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">{mt.status}</Badge>}
        />
      ))}
    </SettingsCard>
  );
}

// ---------------------------------------------------------------------- Reports
function Reports({ userId }: { userId: string }) {
  const r = useQuery(adminUserReportsQuery(userId));
  if (r.isLoading || !r.data) return <GridSkeleton />;
  const { against, submitted } = r.data;
  if (against.length === 0 && submitted.length === 0) return <EmptyStateCard icon={<Flag style={{ width: 24, height: 24 }} />} title="No reports" />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
      {against.length > 0 && (
        <div>
          <Text variant="overline" tone="muted">Reports against this user</Text>
          <SettingsCard style={{ marginTop: spacing[2] }}>
            {against.map((rep) => (
              <SettingsRow key={rep.id} title={rep.reason} subtitle={`${rep.details ?? ""} · by ${rep.reporter ?? "unknown"} · ${timeAgo(rep.createdAt)}`} trailing={<Badge tone={rep.status === "resolved" ? "success" : "warning"}>{rep.status}</Badge>} />
            ))}
          </SettingsCard>
        </div>
      )}
      {submitted.length > 0 && (
        <div>
          <Text variant="overline" tone="muted">Reports submitted by this user</Text>
          <SettingsCard style={{ marginTop: spacing[2] }}>
            {submitted.map((rep) => (
              <SettingsRow key={rep.id} title={rep.reason} subtitle={`against ${rep.reported ?? "unknown"} · ${timeAgo(rep.createdAt)}`} trailing={<Badge tone={rep.status === "resolved" ? "success" : "neutral"}>{rep.status}</Badge>} />
            ))}
          </SettingsCard>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------- Devices
function Devices({ userId }: { userId: string }) {
  const d = useQuery(adminUserDevicesQuery(userId));
  if (d.isLoading || !d.data) return <GridSkeleton />;
  if (d.data.length === 0) return <EmptyStateCard icon={<Smartphone style={{ width: 24, height: 24 }} />} title="No device sessions" />;
  return (
    <SettingsCard>
      {d.data.map((dev) => (
        <SettingsRow
          key={dev.id}
          leading={<Smartphone style={{ width: 18, height: 18, color: colors.textSecondary }} />}
          title={dev.platform || "Unknown device"}
          subtitle={`Last seen ${timeAgo(dev.lastSeenAt)}`}
          trailing={dev.revoked ? <Badge tone="neutral">Revoked</Badge> : <Badge tone="success" dot pulse>Active</Badge>}
        />
      ))}
    </SettingsCard>
  );
}

// ---------------------------------------------------------------------- Actions
type ActionKey = "suspend" | "ban" | "restore" | "delete" | "verify" | "unverify" | "pending" | "reset_discovery" | "force_logout" | "clear_reports" | "purge";

function Actions({ u, onDone }: { u: AdminUserDetail; onDone: () => void }) {
  const navigate = useNavigate();
  const [pending, setPending] = useState<ActionKey | null>(null);
  const [running, setRunning] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async () => {
    if (!pending) return;
    setRunning(true);
    setMsg(null);
    try {
      switch (pending) {
        case "suspend": await setAccountStatus({ data: { userId: u.id, status: "suspended" } }); break;
        case "ban": await setAccountStatus({ data: { userId: u.id, status: "banned" } }); break;
        case "restore": await setAccountStatus({ data: { userId: u.id, status: "active" } }); break;
        case "delete": await setAccountStatus({ data: { userId: u.id, status: "deleted" } }); break;
        case "verify": await setVerification({ data: { userId: u.id, status: "verified" } }); break;
        case "unverify": await setVerification({ data: { userId: u.id, status: "unverified" } }); break;
        case "pending": await setVerification({ data: { userId: u.id, status: "pending" } }); break;
        case "reset_discovery": {
          const r = await resetDiscovery({ data: { userId: u.id } });
          setMsg({ ok: true, text: `Discovery re-enabled — ${r.swipesCleared} swipe${r.swipesCleared === 1 ? "" : "s"} cleared, deck refreshed.` });
          onDone();
          return;
        }
        case "force_logout": await forceLogout({ data: { userId: u.id } }); break;
        case "clear_reports": await clearReports({ data: { userId: u.id } }); break;
        case "purge":
          await adminDeleteUser({ data: { userId: u.id, reason: reason.trim() || undefined } });
          onDone();
          navigate({ to: "/admin/users", replace: true });
          return;
      }
      setMsg({ ok: true, text: "Action applied successfully." });
      onDone();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Action failed." });
    } finally {
      setRunning(false);
      setPending(null);
      setReason("");
      setConfirmText("");
    }
  };

  const META: Record<ActionKey, { label: string; desc: string; danger?: boolean; icon: React.ReactNode }> = {
    suspend: { label: "Suspend user", desc: "Remove from discovery, block matching and messaging. Account preserved.", icon: <PauseCircle style={I} /> },
    ban: { label: "Ban user", desc: "Terminate all sessions, hide profile and block authentication.", danger: true, icon: <Ban style={I} /> },
    restore: { label: "Restore user", desc: "Return the account to active and re-enable discovery.", icon: <RotateCcw style={I} /> },
    delete: { label: "Delete user", desc: "Soft-delete this account. Audit logs are preserved.", danger: true, icon: <Trash2 style={I} /> },
    verify: { label: "Verify user", desc: "Mark this account as verified.", icon: <ShieldCheck style={I} /> },
    unverify: { label: "Remove verification", desc: "Mark this account as unverified.", icon: <ShieldCheck style={I} /> },
    pending: { label: "Set verification pending", desc: "Mark verification as pending review.", icon: <Clock style={I} /> },
    reset_discovery: { label: "Reset discovery", desc: "Re-enable discovery, restore profile visibility and clear swipe history so the deck refills.", icon: <Radio style={I} /> },
    force_logout: { label: "Force logout", desc: "Revoke every active session; the user must sign in again.", icon: <LogOut style={I} /> },
    clear_reports: { label: "Clear reports", desc: "Mark all open reports against this user as resolved.", icon: <Flag style={I} /> },
    purge: { label: "Permanently delete user", desc: "Irreversibly erase this account and everything linked to it — profile, photos, matches, chats, swipes and reports. An audit note is kept.", danger: true, icon: <Trash2 style={I} /> },
  };

  if (pending) {
    const m = META[pending];
    const isPurge = pending === "purge";
    const canConfirm = !isPurge || confirmText.trim().toUpperCase() === "DELETE";
    return (
      <Card padding={spacing[4]} style={{ border: `1px solid ${m.danger ? "rgba(255,59,48,0.24)" : surfaces.border}` }}>
        <Text variant="headingSm" color={colors.textPrimary}>{m.label}</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>{m.desc}</Text>
        <Text variant="caption" tone="muted" style={{ marginTop: spacing[2] }}>Target: {u.fullName || u.phone || u.id}</Text>
        {isPurge && (
          <div style={{ marginTop: spacing[3], display: "flex", flexDirection: "column", gap: spacing[2] }}>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Reason for deletion (saved to the audit log)"
              className="w-full outline-none"
              style={{ borderRadius: radii.md, padding: "10px 14px", fontSize: 14, background: surfaces.glassSoft, border: `1px solid ${surfaces.border}`, color: colors.textPrimary, resize: "none" }}
            />
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              autoCapitalize="characters"
              className="w-full outline-none"
              style={{ borderRadius: radii.md, padding: "10px 14px", fontSize: 14, background: surfaces.glassSoft, border: `1px solid ${surfaces.border}`, color: colors.textPrimary }}
            />
          </div>
        )}
        <div className="flex items-center" style={{ gap: spacing[2], marginTop: spacing[4] }}>
          <Button variant={m.danger ? "danger" : "primary"} loading={running} disabled={!canConfirm} onClick={run}>Confirm</Button>
          <Button variant="ghost" onClick={() => { setPending(null); setReason(""); setConfirmText(""); }} disabled={running}>Cancel</Button>
        </div>
      </Card>
    );
  }

  const order: ActionKey[] = ["suspend", "ban", "restore", "delete", "verify", "unverify", "pending", "reset_discovery", "force_logout", "clear_reports", "purge"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
      {msg && (
        <Card padding={spacing[3]}>
          <Text variant="body" color={msg.ok ? colors.success : colors.danger}>{msg.text}</Text>
        </Card>
      )}
      <SettingsCard>
        {order.map((k) => (
          <SettingsRow
            key={k}
            leading={<span style={{ color: META[k].danger ? colors.danger : colors.primary, display: "flex" }}>{META[k].icon}</span>}
            title={META[k].label}
            subtitle={META[k].desc}
            onClick={() => { setMsg(null); setPending(k); }}
            chevron
          />
        ))}
      </SettingsCard>
    </div>
  );
}

// ------------------------------------------------------------------- scaffold
function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: spacing[4], paddingBottom: spacing[9] }}>
      <TopBar title="User Detail" onBack={onBack} />
      {children}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: spacing[3] }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}><Skeleton style={{ height: 12, width: "60%" }} /><Skeleton style={{ height: 24, width: "40%", marginTop: 12 }} /></Card>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: spacing[4] }}>
      <Skeleton style={{ height: 52, borderRadius: radii.lg }} />
      <Card padding={spacing[4]} style={{ marginTop: spacing[4] }}>
        <div className="flex items-center" style={{ gap: spacing[3] }}>
          <Skeleton style={{ width: 72, height: 72, borderRadius: 999 }} />
          <div style={{ flex: 1 }}><Skeleton style={{ height: 18, width: "50%" }} /><Skeleton style={{ height: 14, width: "70%", marginTop: 10 }} /></div>
        </div>
      </Card>
    </div>
  );
}

function DetailError() {
  const router = useRouter();
  return (
    <div className="mx-auto text-center" style={{ maxWidth: 420, padding: spacing[6] }}>
      <Text variant="headingSm" color={colors.textPrimary}>Something went wrong</Text>
      <div style={{ marginTop: spacing[4] }}><Button variant="primary" onClick={() => router.invalidate()}>Try again</Button></div>
    </div>
  );
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: spacing[4] }}>
      <TopBar title="User Detail" onBack={() => navigate({ to: "/admin/users" })} />
      <EmptyStateCard icon={<UserIcon style={{ width: 26, height: 26 }} />} title="User not found" description="This user does not exist." action={<Button variant="primary" onClick={() => navigate({ to: "/admin/users" })}>Back to users</Button>} />
    </div>
  );
}
