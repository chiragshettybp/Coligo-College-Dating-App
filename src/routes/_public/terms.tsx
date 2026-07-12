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

export const Route = createFileRoute("/_public/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — CampusMatch" },
      {
        name: "description",
        content:
          "The terms of service for using CampusMatch, the verified dating app for college students in India.",
      },
      { property: "og:title", content: "Terms & Conditions — CampusMatch" },
      {
        property: "og:description",
        content: "The terms of service for using CampusMatch.",
      },
      { property: "og:type", content: "article" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(legalDocumentQuery("terms")),
  pendingComponent: () => (
    <PageContainer narrow>
      <LegalDocumentSkeleton />
    </PageContainer>
  ),
  component: TermsPage,
  notFoundComponent: () => (
    <PageContainer narrow>
      <Text variant="headingLg">Document not found</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>
        This document is not available right now.
      </Text>
    </PageContainer>
  ),
});

function TermsPage() {
  const { data: doc } = useSuspenseQuery(legalDocumentQuery("terms"));
  if (!doc) throw notFound();
  return (
    <PageContainer narrow>
      <LegalDocumentView doc={doc} />
    </PageContainer>
  );
}
