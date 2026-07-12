// /onboarding/photos — upload 2–6 profile photos (compress, reorder, primary).
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Star, ChevronUp, ChevronDown, Loader2 } from "lucide-react";

import { OnboardingScreen, InfoNote } from "@/components/onboarding/parts";
import { useOnboardingState } from "@/components/onboarding/useOnboarding";
import {
  savePhoto,
  deletePhoto,
  reorderPhotos,
  advanceOnboardingStep,
} from "@/lib/onboarding.functions";
import { LIMITS } from "@/lib/onboarding";
import { compressImage, isAcceptedImage } from "@/lib/image";
import { supabase } from "@/integrations/supabase/client";
import { Text } from "@/components/ds/glass";
import { colors, radii, surfaces, spacing, shadows, gradients } from "@/lib/ds";

export const Route = createFileRoute("/onboarding/photos")({
  head: () => ({ meta: [{ title: "Your photos — CampusMatch" }, { name: "robots", content: "noindex" }] }),
  component: PhotosStep,
});

function PhotosStep() {
  const state = useOnboardingState();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const doSave = useServerFn(savePhoto);
  const doDelete = useServerFn(deletePhoto);
  const doReorder = useServerFn(reorderPhotos);
  const doAdvance = useServerFn(advanceOnboardingStep);

  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const photos = state.photos;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["onboarding", "state"] });

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

  const canContinue = photos.length >= LIMITS.photosMin;

  const onContinue = async () => {
    if (!canContinue || advancing) return;
    setAdvancing(true);
    try {
      await doAdvance({ data: { step: "bio" } });
      await invalidate();
      navigate({ to: "/onboarding/bio" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setAdvancing(false);
    }
  };

  const slots = LIMITS.photosMax;

  return (
    <OnboardingScreen
      title="Add your photos"
      subtitle={`Add ${LIMITS.photosMin}–${LIMITS.photosMax} photos. Your first photo is your main picture.`}
      onContinue={onContinue}
      continueDisabled={!canContinue}
      loading={advancing}
      error={error}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing[2] }}>
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
                ) : null}
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
        {photos.length}/{LIMITS.photosMax} added{photos.length < LIMITS.photosMin ? ` · add ${LIMITS.photosMin - photos.length} more to continue` : ""}
      </Text>

      <InfoNote>Photos are private to CampusMatch and only shown to verified students during matching.</InfoNote>
    </OnboardingScreen>
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
