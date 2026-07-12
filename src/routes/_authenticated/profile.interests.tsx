// ============================================================================
// /profile/interests — manage the user's interests. Searchable selectable
// chips backed by Supabase; enforces min/max selection and prevents
// duplicates. Persists through the shared setInterests function and syncs via
// realtime. New admin-added interests appear automatically.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSuspenseQuery, useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Search, Check } from "lucide-react";

import {
  myInterestsQuery,
  profileCompletionQuery,
} from "@/lib/profile-full.functions";
import { interestsListQuery, setInterests } from "@/lib/onboarding.functions";
import { LIMITS } from "@/lib/onboarding";
import { colors, spacing, radii, surfaces } from "@/lib/ds";
import { Text, Button, Skeleton, Chip } from "@/components/ds/glass";
import { EmptyStateFromPreset } from "@/components/ds/empty-state";
import { TopBar, SearchBar } from "@/components/ds/navigation";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/profile/interests")({
  head: () => ({ meta: [{ title: "Your interests — Coligo" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(myInterestsQuery());
    context.queryClient.ensureQueryData(interestsListQuery());
  },
  pendingComponent: InterestsSkeleton,
  errorComponent: InterestsError,
  component: InterestsPage,
});

function InterestsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: mine } = useSuspenseQuery(myInterestsQuery());
  const { data: all } = useSuspenseQuery(interestsListQuery());
  const save = useServerFn(setInterests);

  const [selected, setSelected] = useState<Set<string>>(new Set(mine.map((i) => i.id)));
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? all.filter((i) => i.name.toLowerCase().includes(q)) : all;
  }, [all, search]);

  const toggle = (id: string) => {
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= LIMITS.interestsMax) {
          setError(`Pick up to ${LIMITS.interestsMax} interests.`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const mutation = useMutation({
    mutationFn: () => save({ data: { interestIds: Array.from(selected) } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: myInterestsQuery().queryKey });
      await qc.invalidateQueries({ queryKey: profileCompletionQuery().queryKey });
      toast.success("Interests updated");
      navigate({ to: "/profile" });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Couldn't save. Please try again."),
  });

  const onSave = () => {
    setError(null);
    if (selected.size < LIMITS.interestsMin) return setError(`Pick at least ${LIMITS.interestsMin} interests.`);
    mutation.mutate();
  };

  return (
    <DiscoverShell active="profile">
      <TopBar title="Interests" onBack={() => navigate({ to: "/profile" })} />

      <div style={{ marginTop: spacing[3] }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search interests"
          icon={<Search style={{ width: 18, height: 18 }} />}
        />
      </div>

      <Text variant="caption" tone="muted" style={{ display: "block", marginTop: spacing[3] }}>
        {selected.size}/{LIMITS.interestsMax} selected · pick at least {LIMITS.interestsMin}
      </Text>

      <div className="flex flex-wrap" style={{ gap: spacing[2], marginTop: spacing[2] }}>
        {filtered.map((it) => {
          const isSel = selected.has(it.id);
          return (
            <Chip key={it.id} selected={isSel} onClick={() => toggle(it.id)}>
              {isSel && <Check style={{ width: 14, height: 14 }} />}
              {it.name}
            </Chip>
          );
        })}
        {filtered.length === 0 && (
          <Text variant="bodySm" tone="muted">
            No interests match your search.
          </Text>
        )}
      </div>

      {error && (
        <Text variant="bodySm" style={{ color: colors.danger, marginTop: spacing[3] }}>
          {error}
        </Text>
      )}

      <div
        style={{
          position: "sticky",
          bottom: spacing[3],
          marginTop: spacing[5],
          padding: spacing[1],
          borderRadius: radii.lg,
          background: surfaces.glass,
          backdropFilter: "blur(16px)",
        }}
      >
        <Button variant="primary" fullWidth loading={mutation.isPending} onClick={onSave}>
          Save interests
        </Button>
      </div>
    </DiscoverShell>
  );
}

/* --------------------------------------------------------------- states --- */

function InterestsSkeleton() {
  return (
    <DiscoverShell active="profile">
      <TopBar title="Interests" />
      <Skeleton style={{ height: 44, borderRadius: 12, marginTop: spacing[3] }} />
      <div className="flex flex-wrap" style={{ gap: spacing[2], marginTop: spacing[4] }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 36, width: 90, borderRadius: 999 }} />
        ))}
      </div>
    </DiscoverShell>
  );
}

function InterestsError() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="profile">
      <TopBar title="Interests" />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyStateFromPreset preset="error" onPrimary={() => navigate({ to: "/profile" })} />
      </div>
    </DiscoverShell>
  );
}
