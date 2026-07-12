// /onboarding/looking-for — matching preference.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, User, Users } from "lucide-react";

import { OnboardingScreen, SelectableGrid, SelectableCard } from "@/components/onboarding/parts";
import { useOnboardingState, useSaveStep } from "@/components/onboarding/useOnboarding";
import { LOOKING_FOR_OPTIONS } from "@/lib/onboarding";

export const Route = createFileRoute("/onboarding/looking-for")({
  head: () => ({ meta: [{ title: "Looking for — Coligo" }, { name: "robots", content: "noindex" }] }),
  component: LookingForStep,
});

const ICONS: Record<string, React.ReactNode> = {
  women: <User style={{ width: 22, height: 22 }} />,
  men: <User style={{ width: 22, height: 22 }} />,
  everyone: <Users style={{ width: 22, height: 22 }} />,
};

function LookingForStep() {
  const state = useOnboardingState();
  const [pref, setPref] = useState<string | null>(state.lookingFor);
  const { submit, loading, error } = useSaveStep("looking-for");

  return (
    <OnboardingScreen
      title="Who would you like to meet?"
      subtitle="We'll use this to show you the right people."
      onContinue={() => pref && submit({ looking_for: pref })}
      continueDisabled={!pref}
      loading={loading}
      error={error}
    >
      <SelectableGrid>
        {LOOKING_FOR_OPTIONS.map((o) => (
          <SelectableCard
            key={o.value}
            label={o.label}
            icon={ICONS[o.value] ?? <Heart style={{ width: 22, height: 22 }} />}
            selected={pref === o.value}
            onClick={() => setPref(o.value)}
          />
        ))}
      </SelectableGrid>
    </OnboardingScreen>
  );
}
