// ============================================================================
// /admin/colleges/new — dedicated full-page college creation. Admin-only.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { adminGuardQuery } from "@/lib/admin.functions";
import { CollegeForm } from "@/components/admin/college-form";
import { Text, Button } from "@/components/ds/glass";
import { TopBar } from "@/components/ds/navigation";
import { colors, spacing } from "@/lib/ds";

export const Route = createFileRoute("/admin/colleges/new")({
  head: () => ({
    meta: [
      { title: "New college — Coligo admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NewCollegeGuard,
});

function NewCollegeGuard() {
  const navigate = useNavigate();
  const { data: allowed, isLoading, isError, refetch } = useQuery(adminGuardQuery());
  useEffect(() => {
    if (!isLoading && allowed === false) navigate({ to: "/admin/login", replace: true });
  }, [isLoading, allowed, navigate]);

  if (isLoading) return null;
  if (isError) {
    return (
      <div className="mx-auto text-center" style={{ maxWidth: 420, padding: spacing[6] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Couldn't reach the server</Text>
        <div style={{ marginTop: spacing[4] }}><Button variant="primary" onClick={() => refetch()}>Retry</Button></div>
      </div>
    );
  }
  if (!allowed) return null;
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: spacing[4], paddingBottom: spacing[9] }}>
      <TopBar title="Add College" onBack={() => navigate({ to: "/admin/colleges" })} />
      <div style={{ marginTop: spacing[4] }}>
        <CollegeForm />
      </div>
    </div>
  );
}
