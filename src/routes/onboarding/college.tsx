// /onboarding/college — searchable college selector (Supabase-backed).
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { OnboardingScreen } from "@/components/onboarding/parts";
import { SearchSelect } from "@/components/onboarding/SearchSelect";
import { useOnboardingState, useSaveStep } from "@/components/onboarding/useOnboarding";
import { collegesQuery } from "@/lib/onboarding.functions";

export const Route = createFileRoute("/onboarding/college")({
  head: () => ({
    meta: [
      { title: "Select Your College — Coligo Onboarding" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CollegeStep,
});

function CollegeStep() {
  const state = useOnboardingState();
  const [collegeId, setCollegeId] = useState<string | null>(state.collegeId);
  const { submit, loading: saving, error: saveErr } = useSaveStep("college");
  const { data, isLoading, error, refetch } = useQuery(collegesQuery());

  return (
    <OnboardingScreen
      title="Where do you study?"
      subtitle="Find and select your college."
      onContinue={() => collegeId && submit({ college_id: collegeId })}
      continueDisabled={!collegeId}
      loading={saving}
      error={saveErr}
    >
      <SearchSelect
        items={(data ?? []).map((c) => ({ id: c.id, name: c.name, subtitle: c.city }))}
        value={collegeId}
        onChange={setCollegeId}
        placeholder="Search colleges…"
        loading={isLoading}
        error={error ? "Couldn't load colleges." : null}
        onRetry={() => refetch()}
        emptyText="No colleges match your search."
      />
    </OnboardingScreen>
  );
}
