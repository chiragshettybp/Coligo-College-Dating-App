// ============================================================================
// /admin/colleges/:collegeId/edit — dedicated full-page college edit. Admin-only.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { adminGuardQuery } from "@/lib/admin.functions";
import { collegeDetailQuery } from "@/lib/admin-colleges.functions";
import { CollegeForm } from "@/components/admin/college-form";
import { Text, Button, Skeleton } from "@/components/ds/glass";
import { Card } from "@/components/ds/card";
import { TopBar } from "@/components/ds/navigation";
import { colors, spacing } from "@/lib/ds";

export const Route = createFileRoute("/admin/colleges/$collegeId/edit")({
  head: () => ({
    meta: [
      { title: "Edit college — Coligo admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EditCollegeGuard,
});

function EditCollegeGuard() {
  const navigate = useNavigate();
  const { collegeId } = Route.useParams();
  const { data: allowed, isLoading } = useQuery(adminGuardQuery());
  useEffect(() => {
    if (!isLoading && allowed === false) navigate({ to: "/admin/login", replace: true });
  }, [isLoading, allowed, navigate]);

  const detail = useQuery({ ...collegeDetailQuery(collegeId), enabled: allowed === true });

  if (isLoading || (allowed && detail.isLoading)) {
    return <div style={{ maxWidth: 760, margin: "0 auto", padding: spacing[4] }}><Skeleton style={{ height: 320 }} /></div>;
  }
  if (!allowed) return null;

  if (detail.isError || detail.data === null) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: spacing[4] }}>
        <TopBar title="Edit College" onBack={() => navigate({ to: "/admin/colleges" })} />
        <Card padding={spacing[5]} style={{ marginTop: spacing[4], textAlign: "center" }}>
          <Text variant="headingSm" color={colors.textPrimary}>College not found</Text>
          <div style={{ marginTop: spacing[3] }}><Button variant="primary" onClick={() => navigate({ to: "/admin/colleges" })}>Back to colleges</Button></div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: spacing[4], paddingBottom: spacing[9] }}>
      <TopBar title="Edit College" onBack={() => navigate({ to: "/admin/colleges/$collegeId", params: { collegeId } })} />
      <div style={{ marginTop: spacing[4] }}>
        <CollegeForm initial={detail.data} />
      </div>
    </div>
  );
}
