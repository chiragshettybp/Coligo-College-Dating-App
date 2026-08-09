// /onboarding/interests — multi-select interests (min 3, max 10), realtime.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";

import { OnboardingScreen } from "@/components/onboarding/parts";
import { useOnboardingState } from "@/components/onboarding/useOnboarding";
import { interestsListQuery, setInterests } from "@/lib/onboarding.functions";
import { LIMITS } from "@/lib/onboarding";
import { supabase } from "@/integrations/supabase/client";
import { Text, Chip, Skeleton } from "@/components/ds/glass";
import { colors, radii, surfaces, spacing } from "@/lib/ds";

export const Route = createFileRoute("/onboarding/interests")({
  head: () => ({
    meta: [
      { title: "Your Interests — Coligo Onboarding" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InterestsStep,
});

function InterestsStep() {
  const state = useOnboardingState();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const save = useServerFn(setInterests);
  const { data, isLoading, error, refetch } = useQuery(interestsListQuery());

  const [selected, setSelected] = useState<string[]>(state.interestIds);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // Realtime: reflect admin-added interests without a refresh.
  useEffect(() => {
    const channel = supabase
      .channel("onboarding_interests")
      .on("postgres_changes", { event: "*", schema: "public", table: "interests" }, () => {
        queryClient.invalidateQueries({ queryKey: ["ref", "interests"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter((i) => (term ? i.name.toLowerCase().includes(term) : true));
  }, [q, data]);

  const toggle = (id: string) => {
    setSaveErr(null);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= LIMITS.interestsMax) return prev;
      return [...prev, id];
    });
  };

  const canContinue = selected.length >= LIMITS.interestsMin;

  const onContinue = async () => {
    if (!canContinue || saving) return;
    setSaving(true);
    setSaveErr(null);
    try {
      await save({ data: { interestIds: selected } });
      await queryClient.invalidateQueries({ queryKey: ["onboarding", "state"] });
      navigate({ to: "/onboarding/complete" });
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "Couldn't save your interests.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingScreen
      title="What are you into?"
      subtitle={`Pick ${LIMITS.interestsMin}–${LIMITS.interestsMax} interests. ${selected.length} selected.`}
      onContinue={onContinue}
      continueDisabled={!canContinue}
      loading={saving}
      error={saveErr ?? (error ? "Couldn't load interests." : null)}
    >
      <div
        className="flex items-center"
        style={{
          gap: spacing[1],
          padding: "0 14px",
          borderRadius: radii.md,
          background: surfaces.glassSoft,
          border: `1px solid ${surfaces.border}`,
          marginBottom: spacing[3],
        }}
      >
        <Search style={{ width: 18, height: 18, color: colors.textMuted }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search interests…"
          aria-label="Search interests"
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", padding: "12px 4px", fontSize: 16, color: colors.textPrimary }}
        />
      </div>

      {isLoading ? (
        <div className="flex" style={{ gap: spacing[1], flexWrap: "wrap" }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 38, width: 96, borderRadius: 999 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Text variant="body" tone="muted" style={{ textAlign: "center", padding: spacing[4] }}>
          No interests found.{" "}
          <button type="button" onClick={() => refetch()} style={{ color: colors.primary, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
            Retry
          </button>
        </Text>
      ) : (
        <div className="flex" style={{ gap: spacing[1], flexWrap: "wrap", maxHeight: 360, overflowY: "auto" }}>
          {filtered.map((i) => (
            <Chip key={i.id} selected={selected.includes(i.id)} onClick={() => toggle(i.id)}>
              {i.name}
            </Chip>
          ))}
        </div>
      )}
    </OnboardingScreen>
  );
}
