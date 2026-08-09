import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { legalDocumentQuery } from "@/lib/public-content.functions";
import {
  LegalDocumentView,
  LegalDocumentSkeleton,
} from "@/components/public/LegalDocumentView";
import { PageContainer } from "@/components/public/Timeline";
import { Text } from "@/components/ds/glass";
import { spacing } from "@/lib/ds";

export const Route = createFileRoute("/_public/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — How Coligo Protects Your Data" },
      {
        name: "description",
        content: "Your privacy is our priority. Learn how Coligo secures student data and manages your personal information.",
      },
      { property: "og:title", content: "Coligo Privacy Policy" },
      {
        property: "og:description",
        content: "Learn how we protect and manage your verified student data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(legalDocumentQuery("privacy")),
  pendingComponent: () => (
    <PageContainer narrow>
      <LegalDocumentSkeleton />
    </PageContainer>
  ),
  component: PrivacyPage,
  notFoundComponent: () => (
    <PageContainer narrow>
      <Text variant="headingLg">Document not found</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>
        This document is not available right now.
      </Text>
    </PageContainer>
  ),
});

function PrivacyPage() {
  const { data: doc } = useSuspenseQuery(legalDocumentQuery("privacy"));
  if (!doc) throw notFound();
  return (
    <PageContainer narrow>
      <LegalDocumentView doc={doc} />
    </PageContainer>
  );
}
