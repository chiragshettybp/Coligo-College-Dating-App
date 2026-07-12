import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";

import { PublicNav } from "@/components/public/PublicNav";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Button, Text } from "@/components/ds/glass";
import { APP_BACKGROUND, FONT_FAMILY, spacing } from "@/lib/ds";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
  errorComponent: PublicErrorComponent,
});

function PublicLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: APP_BACKGROUND,
        backgroundAttachment: "fixed",
        fontFamily: FONT_FAMILY,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PublicNav />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}

function PublicErrorComponent({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div
      className="mx-auto text-center"
      style={{ maxWidth: 520, padding: `${spacing[9]}px ${spacing[4]}px` }}
    >
      <Text variant="headingLg">Something went wrong</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>
        {error.message || "We couldn't load this page. Please try again."}
      </Text>
      <div style={{ marginTop: spacing[4], display: "inline-flex", gap: spacing[1] }}>
        <Button variant="primary" onClick={() => router.invalidate()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
