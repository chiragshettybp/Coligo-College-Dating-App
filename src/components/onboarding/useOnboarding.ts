// ============================================================================
// Client hook: read onboarding state + persist a form step, then advance.
// ============================================================================
import { useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";

import {
  onboardingStateQuery,
  saveOnboardingStep,
  type OnboardingState,
} from "@/lib/onboarding.functions";
import { STEP_SCHEMAS, nextStep, type StepWithForm } from "@/lib/onboarding";

export function useOnboardingState(): OnboardingState {
  const { data } = useSuspenseQuery(onboardingStateQuery());
  return data;
}

export function useSaveStep(step: StepWithForm) {
  const save = useServerFn(saveOnboardingStep);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (values: Record<string, unknown>) => {
      if (loading) return;
      setError(null);
      const parsed = STEP_SCHEMAS[step].safeParse(values);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Please check your input.");
        return;
      }
      setLoading(true);
      try {
        await save({ data: { step, values } });
        await queryClient.invalidateQueries({ queryKey: ["onboarding", "state"] });
        navigate({ to: `/onboarding/${nextStep(step)}` });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [loading, save, step, queryClient, navigate],
  );

  return { submit, loading, error, setError };
}
