// ============================================================================
// /profile/edit — edit core profile fields. Loads current values, validates
// with the same Zod schemas onboarding uses, persists to Supabase and returns
// to the profile. College / department are searchable Supabase-backed lists.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery, useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  fullProfileQuery,
  updateCoreProfile,
  profileCompletionQuery,
} from "@/lib/profile-full.functions";
import { collegesQuery, departmentsQuery } from "@/lib/onboarding.functions";
import { graduationYearOptions, SEMESTER_OPTIONS, maxDobString, minDobString } from "@/lib/onboarding";
import { colors, spacing, radii, surfaces } from "@/lib/ds";
import { Text, Button, Skeleton } from "@/components/ds/glass";
import { SettingsGroup, RadioGroup, Dropdown } from "@/components/ds/settings";
import { SearchSelect } from "@/components/onboarding/SearchSelect";
import { EmptyStateFromPreset } from "@/components/ds/empty-state";
import { TopBar } from "@/components/ds/navigation";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/profile/edit")({
  head: () => ({ meta: [{ title: "Edit profile — Coligo" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(fullProfileQuery());
    context.queryClient.ensureQueryData(collegesQuery());
    context.queryClient.ensureQueryData(departmentsQuery());
  },
  pendingComponent: EditSkeleton,
  errorComponent: EditError,
  component: EditProfilePage,
});

const fieldLabel = { display: "block", marginBottom: 6, color: colors.textSecondary, fontSize: 14, fontWeight: 600 } as const;
const fieldInput = {
  width: "100%",
  borderRadius: radii.md,
  padding: "13px 16px",
  fontSize: 16,
  fontWeight: 500,
  color: colors.textPrimary,
  background: surfaces.glassSoft,
  border: `1px solid ${surfaces.border}`,
  outline: "none",
} as const;

function EditProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useSuspenseQuery(fullProfileQuery());
  const { data: colleges, isLoading: cLoading, error: cErr, refetch: cRefetch } = useQuery(collegesQuery());
  const { data: departments, isLoading: dLoading, error: dErr, refetch: dRefetch } = useQuery(departmentsQuery());
  const save = useServerFn(updateCoreProfile);

  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [collegeId, setCollegeId] = useState<string | null>(profile?.collegeId ?? null);
  const [departmentId, setDepartmentId] = useState<string | null>(profile?.departmentId ?? null);
  const [gradYear, setGradYear] = useState<number>(profile?.graduationYear ?? new Date().getFullYear() + 1);
  const [semester, setSemester] = useState<number>(profile?.semester ?? 1);
  const [dob, setDob] = useState(profile?.dateOfBirth ?? "");
  const [lookingFor, setLookingFor] = useState(profile?.lookingFor ?? "everyone");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          full_name: fullName.trim(),
          college_id: collegeId ?? "",
          department_id: departmentId ?? "",
          graduation_year: gradYear,
          semester,
          date_of_birth: dob,
          looking_for: lookingFor as "women" | "men" | "everyone",
        },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: fullProfileQuery().queryKey });
      await qc.invalidateQueries({ queryKey: profileCompletionQuery().queryKey });
      toast.success("Profile updated");
      navigate({ to: "/profile" });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Couldn't save. Please try again."),
  });

  const onSave = () => {
    setError(null);
    if (fullName.trim().length < 2) return setError("Enter your full name.");
    if (!collegeId) return setError("Select your college.");
    if (!departmentId) return setError("Select your department.");
    if (!dob) return setError("Select your date of birth.");
    mutation.mutate();
  };

  return (
    <DiscoverShell active="profile">
      <TopBar title="Edit profile" onBack={() => navigate({ to: "/profile" })} />

      <div className="flex flex-col" style={{ gap: spacing[4], marginTop: spacing[4] }}>
        <label>
          <span style={fieldLabel}>Full name</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            maxLength={50}
            style={fieldInput}
          />
        </label>

        <div>
          <span style={fieldLabel}>College</span>
          <SearchSelect
            items={(colleges ?? []).map((c) => ({ id: c.id, name: c.name, subtitle: c.city }))}
            value={collegeId}
            onChange={setCollegeId}
            placeholder="Search colleges…"
            loading={cLoading}
            error={cErr ? "Couldn't load colleges." : null}
            onRetry={() => cRefetch()}
            emptyText="No colleges match your search."
          />
        </div>

        <div>
          <span style={fieldLabel}>Department</span>
          <SearchSelect
            items={(departments ?? []).map((d) => ({ id: d.id, name: d.name }))}
            value={departmentId}
            onChange={setDepartmentId}
            placeholder="Search departments…"
            loading={dLoading}
            error={dErr ? "Couldn't load departments." : null}
            onRetry={() => dRefetch()}
            emptyText="No departments match your search."
          />
        </div>

        <SettingsGroup label="Academic">
          <div className="flex items-center justify-between" style={{ padding: `${spacing[2]}px ${spacing[3]}px`, minHeight: 52 }}>
            <Text variant="label">Graduation year</Text>
            <Dropdown
              value={String(gradYear)}
              onChange={(v) => setGradYear(Number(v))}
              options={graduationYearOptions().map((y) => ({ value: String(y), label: String(y) }))}
            />
          </div>
          <div className="flex items-center justify-between" style={{ padding: `${spacing[2]}px ${spacing[3]}px`, minHeight: 52 }}>
            <Text variant="label">Semester</Text>
            <Dropdown
              value={String(semester)}
              onChange={(v) => setSemester(Number(v))}
              options={SEMESTER_OPTIONS.map((s) => ({ value: String(s), label: `Semester ${s}` }))}
            />
          </div>
        </SettingsGroup>

        <label>
          <span style={fieldLabel}>Date of birth</span>
          <input
            type="date"
            value={dob}
            min={minDobString()}
            max={maxDobString()}
            onChange={(e) => setDob(e.target.value)}
            style={fieldInput}
          />
        </label>

        <SettingsGroup label="Looking for">
          <RadioGroup
            value={lookingFor as "women" | "men" | "everyone"}
            onChange={(v) => setLookingFor(v)}
            options={[
              { value: "everyone", label: "Everyone" },
              { value: "women", label: "Women" },
              { value: "men", label: "Men" },
            ]}
          />
        </SettingsGroup>

        {error && (
          <Text variant="bodySm" style={{ color: colors.danger }}>
            {error}
          </Text>
        )}

        <Button variant="primary" fullWidth loading={mutation.isPending} onClick={onSave}>
          Save changes
        </Button>
      </div>
    </DiscoverShell>
  );
}

/* --------------------------------------------------------------- states --- */

function EditSkeleton() {
  return (
    <DiscoverShell active="profile">
      <TopBar title="Edit profile" />
      <div className="flex flex-col" style={{ gap: spacing[4], marginTop: spacing[4] }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} style={{ height: 56, borderRadius: 16 }} />
        ))}
      </div>
    </DiscoverShell>
  );
}

function EditError() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="profile">
      <TopBar title="Edit profile" />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyStateFromPreset preset="error" onPrimary={() => navigate({ to: "/profile" })} />
      </div>
    </DiscoverShell>
  );
}
