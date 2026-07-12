// ============================================================================
// CollegeForm — shared create / edit form for the admin college module.
// Client-side validation + admin-only Supabase Storage uploads for logo/banner.
// Persists through the admin_upsert_college RPC (server re-checks admin role).
// ============================================================================
import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { upsertCollege, type CollegeDetail } from "@/lib/admin-colleges.functions";
import { LOGO_BUCKET, BANNER_BUCKET } from "@/lib/college-media.server";
import { Text, Button, TextField, Toggle } from "@/components/ds/glass";
import { Card } from "@/components/ds/card";
import { colors, radii, spacing, surfaces } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

const MAX_BYTES = 3 * 1024 * 1024;

type Fields = {
  name: string;
  code: string;
  short_name: string;
  description: string;
  website: string;
  city: string;
  district: string;
  state: string;
  country: string;
  discovery_enabled: boolean;
  status: "active" | "disabled" | "archived";
};

export function CollegeForm({ initial }: { initial?: CollegeDetail | null }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const save = useServerFn(upsertCollege);

  const [f, setF] = useState<Fields>({
    name: initial?.name ?? "",
    code: initial?.code ?? "",
    short_name: initial?.short_name ?? "",
    description: initial?.description ?? "",
    website: initial?.website ?? "",
    city: initial?.city ?? "",
    district: initial?.district ?? "",
    state: initial?.state ?? "",
    country: initial?.country ?? "India",
    discovery_enabled: initial?.discovery_enabled ?? true,
    status: initial?.status ?? "active",
  });

  // Media: store the raw storage path (persisted) + a signed preview URL.
  const [logoPath, setLogoPath] = useState<string | null>(initial?.logo_url && !initial.logo_url.startsWith("http") ? initial.logo_url : null);
  const [bannerPath, setBannerPath] = useState<string | null>(initial?.banner_url && !initial.banner_url.startsWith("http") ? initial.banner_url : null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initial?.logo_url ?? null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(initial?.banner_url ?? null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<"logo" | "banner" | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = (patch: Partial<Fields>) => setF((p) => ({ ...p, ...patch }));

  const folder = initial?.id ?? "new";

  const upload = async (kind: "logo" | "banner", file: File) => {
    const bucket = kind === "logo" ? LOGO_BUCKET : BANNER_BUCKET;
    if (!file.type.startsWith("image/")) {
      setErrors((e) => ({ ...e, [kind]: "Please choose an image file" }));
      return;
    }
    if (file.size > MAX_BYTES) {
      setErrors((e) => ({ ...e, [kind]: "Image must be under 3 MB" }));
      return;
    }
    setErrors((e) => ({ ...e, [kind]: "" }));
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${folder}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, cacheControl: "3600" });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      if (kind === "logo") {
        setLogoPath(path);
        setLogoPreview(signed?.signedUrl ?? null);
      } else {
        setBannerPath(path);
        setBannerPreview(signed?.signedUrl ?? null);
      }
      haptic("light");
    } catch (err) {
      setErrors((e) => ({ ...e, [kind]: err instanceof Error ? err.message : "Upload failed" }));
    } finally {
      setUploading(null);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "College name is required";
    if (f.website && !/^https?:\/\//i.test(f.website)) e.website = "Website must start with http:// or https://";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setServerError(null);
    try {
      const payload = {
        name: f.name.trim(),
        code: f.code.trim(),
        short_name: f.short_name.trim(),
        description: f.description.trim(),
        website: f.website.trim(),
        city: f.city.trim(),
        district: f.district.trim(),
        state: f.state.trim(),
        country: f.country.trim() || "India",
        discovery_enabled: f.discovery_enabled,
        status: f.status,
        ...(logoPath ? { logo_url: logoPath } : {}),
        ...(bannerPath ? { banner_url: bannerPath } : {}),
      };
      const res = await save({ data: { id: initial?.id, payload } });
      qc.invalidateQueries({ queryKey: ["admin", "colleges"] });
      qc.invalidateQueries({ queryKey: ["admin", "college"] });
      haptic("light");
      navigate({ to: "/admin/colleges/$collegeId", params: { collegeId: res.id } });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to save college");
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
      {serverError && (
        <Card padding={spacing[3]} style={{ border: `1px solid ${colors.danger}` }}>
          <Text variant="body" color={colors.danger}>{serverError}</Text>
        </Card>
      )}

      {/* Media */}
      <Card padding={spacing[4]}>
        <Text variant="headingSm" color={colors.textPrimary}>Branding</Text>
        <div className="flex flex-wrap" style={{ gap: spacing[4], marginTop: spacing[3] }}>
          <MediaPicker label="Logo" preview={logoPreview} busy={uploading === "logo"} error={errors.logo}
            onPick={(file) => upload("logo", file)}
            onClear={() => { setLogoPath(null); setLogoPreview(null); }} shape="square" />
          <MediaPicker label="Banner" preview={bannerPreview} busy={uploading === "banner"} error={errors.banner}
            onPick={(file) => upload("banner", file)}
            onClear={() => { setBannerPath(null); setBannerPreview(null); }} shape="wide" />
        </div>
      </Card>

      {/* Basics */}
      <Card padding={spacing[4]}>
        <Text variant="headingSm" color={colors.textPrimary}>Details</Text>
        <div style={{ display: "grid", gap: spacing[3], marginTop: spacing[3] }}>
          <TextField label="College name *" value={f.name} error={errors.name} onChange={(e) => set({ name: e.target.value })} placeholder="Indian Institute of Technology, Delhi" />
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: spacing[3] }}>
            <TextField label="College code" value={f.code} error={errors.code} onChange={(e) => set({ code: e.target.value })} placeholder="IITD" />
            <TextField label="Short name" value={f.short_name} onChange={(e) => set({ short_name: e.target.value })} placeholder="IIT Delhi" />
          </div>
          <Field label="Description">
            <textarea value={f.description} onChange={(e) => set({ description: e.target.value })} rows={3}
              placeholder="A short description of the college"
              style={{ width: "100%", borderRadius: radii.md, padding: "12px 16px", fontSize: 15, color: "#fff",
                background: surfaces.glassSoft, border: `1px solid ${surfaces.border}`, resize: "vertical", outline: "none" }} />
          </Field>
          <TextField label="Website" value={f.website} error={errors.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://home.iitd.ac.in" />
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: spacing[3] }}>
            <TextField label="City" value={f.city} onChange={(e) => set({ city: e.target.value })} placeholder="New Delhi" />
            <TextField label="District" value={f.district} onChange={(e) => set({ district: e.target.value })} placeholder="South Delhi" />
          </div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: spacing[3] }}>
            <TextField label="State" value={f.state} onChange={(e) => set({ state: e.target.value })} placeholder="Delhi" />
            <TextField label="Country" value={f.country} onChange={(e) => set({ country: e.target.value })} placeholder="India" />
          </div>
        </div>
      </Card>

      {/* Settings */}
      <Card padding={spacing[4]}>
        <Text variant="headingSm" color={colors.textPrimary}>Settings</Text>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing[3], marginTop: spacing[3] }}>
          <div className="flex items-center justify-between" style={{ gap: spacing[3] }}>
            <div>
              <Text variant="body" color={colors.textPrimary} style={{ fontWeight: 600 }}>Discovery enabled</Text>
              <Text variant="caption" tone="muted">Students at this college appear in discovery.</Text>
            </div>
            <Toggle checked={f.discovery_enabled} onChange={(v) => set({ discovery_enabled: v })} />
          </div>
          <Field label="Status">
            <Select value={f.status} onChange={(v) => set({ status: v as Fields["status"] })}
              options={[["active", "Active"], ["disabled", "Disabled"], ["archived", "Archived"]]} />
          </Field>
        </div>
      </Card>

      <div className="flex items-center" style={{ gap: spacing[2] }}>
        <Button variant="primary" loading={saving} onClick={onSubmit}>{initial ? "Save changes" : "Create college"}</Button>
        <Button variant="ghost" disabled={saving} onClick={() => navigate({ to: initial ? "/admin/colleges/$collegeId" : "/admin/colleges", params: initial ? { collegeId: initial.id } : undefined })}>Cancel</Button>
      </div>
    </div>
  );
}

function MediaPicker({ label, preview, busy, error, onPick, onClear, shape }: {
  label: string; preview: string | null; busy: boolean; error?: string;
  onPick: (file: File) => void; onClear: () => void; shape: "square" | "wide";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const w = shape === "square" ? 96 : 200;
  const h = 96;
  return (
    <div>
      <Text variant="caption" tone="muted" style={{ marginBottom: 6, display: "block" }}>{label}</Text>
      <div style={{ position: "relative", width: w, height: h, borderRadius: radii.md, overflow: "hidden",
        background: surfaces.glassSoft, border: `1px solid ${error ? colors.danger : surfaces.border}`,
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        onClick={() => ref.current?.click()}>
        {preview ? (
          <img src={preview} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : busy ? (
          <Loader2 className="animate-spin" style={{ width: 22, height: 22, color: colors.textMuted }} />
        ) : (
          <ImagePlus style={{ width: 22, height: 22, color: colors.textMuted }} />
        )}
        {busy && preview && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Loader2 className="animate-spin" style={{ width: 22, height: 22, color: "#fff" }} />
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) onPick(file); e.target.value = ""; }} />
      {preview && (
        <button onClick={onClear} style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, background: "transparent", border: "none", color: colors.danger, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          <Trash2 style={{ width: 13, height: 13 }} /> Remove
        </button>
      )}
      {error && <Text variant="caption" color={colors.danger} style={{ marginTop: 4, display: "block" }}>{error}</Text>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block" style={{ color: colors.textSecondary, fontSize: 14, fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

export function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ appearance: "none", width: "100%", borderRadius: radii.md, padding: "12px 16px", fontSize: 15, fontWeight: 500,
        color: colors.textPrimary, background: surfaces.glassSoft, border: `1px solid ${surfaces.border}`, cursor: "pointer" }}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
