// /onboarding/graduation-year — expected graduation year.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { OnboardingScreen, OptionTile } from "@/components/onboarding/parts";
import { useOnboardingState, useSaveStep } from "@/components/onboarding/useOnboarding";
import { graduationYearOptions } from "@/lib/onboarding";
import { spacing } from "@/lib/ds";

export const Route = createFileRoute("/onboarding/graduation-year")({
  head: () => ({
    meta: [
      { title: "Graduation Year — Coligo Onboarding" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: GraduationYearStep,
});

function GraduationYearStep() {
  const state = useOnboardingState();
  const [year, setYear] = useState<number | null>(state.graduationYear);
  const { submit, loading, error } = useSaveStep("graduation-year");
  const years = graduationYearOptions();

  return (
    <OnboardingScreen
      title="When do you graduate?"
      subtitle="Your expected year of graduation."
      onContinue={() => year && submit({ graduation_year: year })}
      continueDisabled={!year}
      loading={loading}
      error={error}
    >
      <div role="radiogroup" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing[2] }}>
        {years.map((y) => (
          <OptionTile key={y} label={String(y)} selected={year === y} onClick={() => setYear(y)} />
        ))}
      </div>
    </OnboardingScreen>
  );
}
