// ============================================================================
// /admin layout — shared shell for the Coligo admin surface. Public parent so
// /admin/login is reachable; each child enforces its own admin guard.
// ============================================================================
import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";

import { Text, Button } from "@/components/ds/glass";
import { APP_BACKGROUND, FONT_FAMILY, colors, spacing } from "@/lib/ds";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  errorComponent: AdminError,
});

function AdminLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: APP_BACKGROUND,
        backgroundAttachment: "fixed",
        fontFamily: FONT_FAMILY,
      }}
    >
      <Outlet />
    </div>
  );
}

function AdminError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="mx-auto text-center" style={{ maxWidth: 440, padding: spacing[6] }}>
      <Text variant="headingLg" color={colors.textPrimary}>Admin error</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>
        {error.message || "Something went wrong."}
      </Text>
      <div style={{ marginTop: spacing[4] }}>
        <Button variant="primary" onClick={() => router.invalidate()}>Try again</Button>
      </div>
    </div>
  );
}
