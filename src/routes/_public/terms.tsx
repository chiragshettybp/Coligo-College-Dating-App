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
      { title: "Terms & Conditions — Coligo Service Agreement" },
      {
        name: "description",
        content: "Review the terms and conditions for using Coligo. We ensure a safe and verified dating experience for college students.",
      },
      { property: "og:title", content: "Coligo Terms & Conditions" },
      {
        property: "og:description",
        content: "Our service agreement for verified college students.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
