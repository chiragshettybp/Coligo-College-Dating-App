// ============================================================================
// Client hook: read onboarding state + persist a form step.
// Optimistic flow — validate locally, patch the cache, navigate INSTANTLY,
// then save to Supabase in the background (with one retry). Roll back only if
// the save ultimately fails so the member never loses progress.
// ============================================================================
import { useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";

import {
  onboardingStateQuery,
  saveOnboardingStep,
  type OnboardingState,
} from "@/lib/onboarding.functions";
import {
  STEP_SCHEMAS,
  nextStep,
  maxAllowedIndex,
  stepIndex,
  ONBOARDING_STEPS,
  type StepWithForm,
} from "@/lib/onboarding";
import { haptic } from "@/lib/haptics";

const KEY = ["onboarding", "state"] as const;

// Maps a step's DB column -> the OnboardingState field for optimistic patching.
const FIELD_MAP: Record<string, keyof OnboardingState> = {
  full_name: "fullName",
  gender: "gender",
  date_of_birth: "dateOfBirth",
  college_id: "collegeId",
  graduation_year: "graduationYear",
  semester: "semester",
  department_id: "departmentId",
  looking_for: "lookingFor",
  bio: "bio",
};

export function useOnboardingState(): OnboardingState {
  const { data } = useSuspenseQuery(onboardingStateQuery());
  return data;
}

export function useSaveStep(step: StepWithForm) {
  const save = useServerFn(saveOnboardingStep);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const submit = useCallback(
    (values: Record<string, unknown>) => {
      const parsed = STEP_SCHEMAS[step].safeParse(values);
      if (!parsed.success) {
        haptic("medium");
        return;
      }

      haptic("selection");

      const target = nextStep(step);
      const prev = queryClient.getQueryData<OnboardingState>(KEY);

      // Optimistically patch the cache so the anti-skip guard lets us advance.
      queryClient.setQueryData<OnboardingState>(KEY, (cur) => {
        const base = cur ?? prev;
        if (!base) return cur;
        const patch: Partial<OnboardingState> = {};
        for (const [col, val] of Object.entries(parsed.data)) {
          const field = FIELD_MAP[col];
          if (field) (patch as Record<string, unknown>)[field] = val;
        }
        const advanced =
          stepIndex(target) > maxAllowedIndex(base.onboardingStep)
            ? target
            : (base.onboardingStep as (typeof ONBOARDING_STEPS)[number]);
        return { ...base, ...patch, onboardingStep: advanced };
      });

      // Navigate immediately — do NOT wait for the network.
      navigate({ to: `/onboarding/${target}` });

      // Persist in the background with one retry; roll back only on hard failure.
      void (async () => {
        try {
          await save({ data: { step, values } }).catch(() =>
            save({ data: { step, values } }),
          );
        } catch {
          queryClient.setQueryData<OnboardingState>(KEY, prev);
          navigate({ to: `/onboarding/${step}` });
        }
      })();
    },
    [save, step, queryClient, navigate],
  );

  // Kept for API compatibility with the step screens.
  return { submit, loading: false, error: null as string | null, setError: () => {} };
}
