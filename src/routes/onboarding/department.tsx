// /onboarding/department — searchable department selector (Supabase-backed).
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { OnboardingScreen } from "@/components/onboarding/parts";
import { SearchSelect } from "@/components/onboarding/SearchSelect";
import { useOnboardingState, useSaveStep } from "@/components/onboarding/useOnboarding";
import { departmentsQuery } from "@/lib/onboarding.functions";

export const Route = createFileRoute("/onboarding/department")({
  head: () => ({ meta: [{ title: "Your department — CampusMatch" }, { name: "robots", content: "noindex" }] }),
  component: DepartmentStep,
});

function DepartmentStep() {
  const state = useOnboardingState();
  const [departmentId, setDepartmentId] = useState<string | null>(state.departmentId);
  const { submit, loading: saving, error: saveErr } = useSaveStep("department");
  const { data, isLoading, error, refetch } = useQuery(departmentsQuery());

  return (
    <OnboardingScreen
      title="What do you study?"
      subtitle="Select your department."
      onContinue={() => departmentId && submit({ department_id: departmentId })}
      continueDisabled={!departmentId}
      loading={saving}
      error={saveErr}
    >
      <SearchSelect
        items={(data ?? []).map((d) => ({ id: d.id, name: d.name }))}
        value={departmentId}
        onChange={setDepartmentId}
        placeholder="Search departments…"
        loading={isLoading}
        error={error ? "Couldn't load departments." : null}
        onRetry={() => refetch()}
        emptyText="No departments match your search."
      />
    </OnboardingScreen>
  );
}
