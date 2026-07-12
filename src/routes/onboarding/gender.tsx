// /onboarding/gender — select gender.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { User, Users, UserCircle2, CircleUser } from "lucide-react";

import { OnboardingScreen, SelectableGrid, SelectableCard } from "@/components/onboarding/parts";
import { useOnboardingState, useSaveStep } from "@/components/onboarding/useOnboarding";
import { GENDER_OPTIONS } from "@/lib/onboarding";

export const Route = createFileRoute("/onboarding/gender")({
  head: () => ({ meta: [{ title: "Your gender — Coligo" }, { name: "robots", content: "noindex" }] }),
  component: GenderStep,
});

const ICONS: Record<string, React.ReactNode> = {
  woman: <UserCircle2 style={{ width: 22, height: 22 }} />,
  man: <User style={{ width: 22, height: 22 }} />,
  nonbinary: <CircleUser style={{ width: 22, height: 22 }} />,
  other: <Users style={{ width: 22, height: 22 }} />,
};

function GenderStep() {
  const state = useOnboardingState();
  const [gender, setGender] = useState<string | null>(state.gender);
  const { submit, loading, error } = useSaveStep("gender");

  return (
    <OnboardingScreen
      title="How do you identify?"
      subtitle="You can always update this later in your profile."
      onContinue={() => gender && submit({ gender })}
      continueDisabled={!gender}
      loading={loading}
      error={error}
    >
      <SelectableGrid>
        {GENDER_OPTIONS.map((o) => (
          <SelectableCard
            key={o.value}
            label={o.label}
            icon={ICONS[o.value]}
            selected={gender === o.value}
            onClick={() => setGender(o.value)}
          />
        ))}
      </SelectableGrid>
    </OnboardingScreen>
  );
}
