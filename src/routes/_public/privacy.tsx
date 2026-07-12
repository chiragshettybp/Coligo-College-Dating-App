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
      { title: "Privacy Policy — CampusMatch" },
      {
        name: "description",
        content:
          "Read how CampusMatch collects, uses, and protects your data. Privacy-first by design for verified college students.",
      },
      { property: "og:title", content: "Privacy Policy — CampusMatch" },
      {
        property: "og:description",
        content: "How CampusMatch collects, uses, and protects your personal data.",
      },
      { property: "og:type", content: "article" },
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
