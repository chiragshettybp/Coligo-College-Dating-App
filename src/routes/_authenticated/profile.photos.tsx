// ============================================================================
// /profile/photos — manage the profile gallery. Upload (client compression),
// delete, reorder and set-primary all run through the shared, RLS-scoped
// onboarding photo functions. Enforces type/size and the 2–6 photo range;
// the first photo is always the primary (and the profile avatar). Realtime
// propagates changes to Discovery, Matches and the preview.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Star, ChevronUp, ChevronDown, Loader2 } from "lucide-react";

import { profileGalleryQuery, profileCompletionQuery } from "@/lib/profile-full.functions";
import { fullProfileQuery } from "@/lib/profile-full.functions";
import { savePhoto, deletePhoto, reorderPhotos } from "@/lib/onboarding.functions";
import { LIMITS } from "@/lib/onboarding";
import { compressImage, isAcceptedImage } from "@/lib/image";
import { supabase } from "@/integrations/supabase/client";
import { colors, radii, surfaces, spacing, shadows, gradients } from "@/lib/ds";
import { Text, Skeleton } from "@/components/ds/glass";
import { EmptyStateFromPreset } from "@/components/ds/empty-state";
import { TopBar } from "@/components/ds/navigation";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/profile/photos")({
  head: () => ({ meta: [{ title: "Manage photos — Coligo" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(profileGalleryQuery()),
  pendingComponent: PhotosSkeleton,
  errorComponent: PhotosError,
  component: PhotosPage,
});

function PhotosPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: photos } = useSuspenseQuery(profileGalleryQuery());
  const doSave = useServerFn(savePhoto);
  const doDelete = useServerFn(deletePhoto);
  const doReorder = useServerFn(reorderPhotos);

  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: profileGalleryQuery().queryKey });
    qc.invalidateQueries({ queryKey: fullProfileQuery().queryKey });
    qc.invalidateQueries({ queryKey: profileCompletionQuery().queryKey });
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || !userId) return;
    setError(null);
    const room = LIMITS.photosMax - photos.length;
    const chosen = Array.from(files).slice(0, room);
    if (chosen.length === 0) {
      setError(`You can upload up to ${LIMITS.photosMax} photos.`);
      return;
    }
    for (const file of chosen) {
      if (!isAcceptedImage(file)) {
        setError("Only image files are allowed.");
        continue;
      }
      if (file.size > LIMITS.photoMaxBytes) {
        setError("Each photo must be under 8MB.");
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const blob = await compressImage(file);
        const path = `${userId}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("profile-photos")
          .upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (upErr) throw upErr;
        await doSave({ data: { storagePath: path } });
        await invalidate();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDelete = async (id: string) => {
    if (photos.length <= LIMITS.photosMin) {
      setError(`Keep at least ${LIMITS.photosMin} photos on your profile.`);
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await doDelete({ data: { id } });
      await invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove photo.");
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...photos];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBusyId(photos[index].id);
    try {
      await doReorder({ data: { orderedIds: next.map((p) => p.id) } });
      await invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reorder.");
    } finally {
      setBusyId(null);
    }
  };

  const setPrimary = async (index: number) => {
    if (index === 0) return;
    const next = [...photos];
    const [pick] = next.splice(index, 1);
    next.unshift(pick);
    setBusyId(photos[index].id);
    try {
      await doReorder({ data: { orderedIds: next.map((p) => p.id) } });
      await invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't set main photo.");
    } finally {
      setBusyId(null);
    }
  };

  const slots = LIMITS.photosMax;

  return (
    <DiscoverShell active="profile">
      <TopBar title="Manage photos" onBack={() => navigate({ to: "/profile" })} />

      <Text variant="bodySm" tone="secondary" style={{ display: "block", marginTop: spacing[3] }}>
        Add {LIMITS.photosMin}–{LIMITS.photosMax} photos. Your first photo is your main picture.
      </Text>

      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing[2], marginTop: spacing[3] }}>
        {Array.from({ length: slots }).map((_, i) => {
          const photo = photos[i];
          if (photo) {
            const busy = busyId === photo.id;
            return (
              <div
                key={photo.id}
                style={{
                  position: "relative",
                  aspectRatio: "3 / 4",
                  borderRadius: radii.md,
                  overflow: "hidden",
                  background: surfaces.glassSoft,
                  border: `1px solid ${surfaces.border}`,
                  boxShadow: shadows.soft,
                }}
              >
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={`Profile photo ${i + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover", opacity: busy ? 0.5 : 1 }}
                  />
                ) : null}
                {photo.isPrimary ? (
                  <span
                    className="inline-flex items-center"
                    style={{
                      position: "absolute",
                      top: 6,
                      left: 6,
                      gap: 4,
                      padding: "3px 8px",
                      borderRadius: radii.pill,
                      background: gradients.primaryButton,
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    <Star style={{ width: 11, height: 11, fill: "currentColor" }} /> Main
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label="Set as main photo"
                    disabled={busy}
                    onClick={() => setPrimary(i)}
                    className="inline-flex items-center"
                    style={{
                      position: "absolute",
                      top: 6,
                      left: 6,
                      gap: 4,
                      padding: "3px 8px",
                      borderRadius: radii.pill,
                      background: "rgba(255,255,255,0.92)",
                      color: colors.textSecondary,
                      fontSize: 11,
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      boxShadow: shadows.soft,
                    }}
                  >
                    <Star style={{ width: 11, height: 11 }} /> Main
                  </button>
                )}
                <div style={{ position: "absolute", bottom: 6, left: 6, right: 6, display: "flex", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <IconBtn label="Move up" disabled={i === 0 || busy} onClick={() => move(i, -1)}>
                      <ChevronUp style={{ width: 15, height: 15 }} />
                    </IconBtn>
                    <IconBtn label="Move down" disabled={i === photos.length - 1 || busy} onClick={() => move(i, 1)}>
                      <ChevronDown style={{ width: 15, height: 15 }} />
                    </IconBtn>
                  </div>
                  <IconBtn label="Remove photo" disabled={busy} danger onClick={() => onDelete(photo.id)}>
                    <Trash2 style={{ width: 15, height: 15 }} />
                  </IconBtn>
                </div>
              </div>
            );
          }
          const isNextUpload = i === photos.length;
          const showSpinner = uploading > 0 && isNextUpload;
          return (
            <button
              key={`slot-${i}`}
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={i > photos.length}
              aria-label="Add photo"
              style={{
                aspectRatio: "3 / 4",
                borderRadius: radii.md,
                background: surfaces.glassSoft,
                border: `1.5px dashed ${i === photos.length ? colors.primary : surfaces.border}`,
                color: colors.textMuted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: i > photos.length ? "default" : "pointer",
                opacity: i > photos.length ? 0.5 : 1,
              }}
            >
              {showSpinner ? (
                <Loader2 className="animate-spin" style={{ width: 22, height: 22, color: colors.primary }} />
              ) : (
                <Plus style={{ width: 22, height: 22 }} />
              )}
            </button>
          );
        })}
      </div>

      <Text variant="caption" tone="muted" style={{ display: "block", marginTop: spacing[2] }}>
        {photos.length}/{LIMITS.photosMax} added
        {photos.length < LIMITS.photosMin ? ` · add ${LIMITS.photosMin - photos.length} more` : ""}
      </Text>

      {error && (
        <Text variant="bodySm" style={{ color: colors.danger, marginTop: spacing[2] }}>
          {error}
        </Text>
      )}
    </DiscoverShell>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  danger,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center justify-center active:scale-90"
      style={{
        width: 28,
        height: 28,
        borderRadius: radii.sm,
        background: "rgba(255,255,255,0.92)",
        color: danger ? colors.danger : colors.textSecondary,
        border: "none",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        boxShadow: shadows.soft,
      }}
    >
      {children}
    </button>
  );
}

/* --------------------------------------------------------------- states --- */

function PhotosSkeleton() {
  return (
    <DiscoverShell active="profile">
      <TopBar title="Manage photos" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing[2], marginTop: spacing[4] }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} style={{ aspectRatio: "3 / 4", borderRadius: 18 }} />
        ))}
      </div>
    </DiscoverShell>
  );
}

function PhotosError() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="profile">
      <TopBar title="Manage photos" />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyStateFromPreset preset="error" onPrimary={() => navigate({ to: "/profile" })} />
      </div>
    </DiscoverShell>
  );
}
