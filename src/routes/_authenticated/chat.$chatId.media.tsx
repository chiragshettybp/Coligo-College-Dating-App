// ============================================================================
// /chat/:chatId/media — every image shared in this conversation, in a
// responsive lazy grid. Tap to open the full-screen viewer. Paginated
// ("Load more") and realtime — new uploads appear without a refresh.
// ============================================================================
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { sharedMediaQuery, getSharedMedia, type SharedMediaItem } from "@/lib/chat.functions";
import { spacing, radii, surfaces } from "@/lib/ds";
import { Button, Skeleton } from "@/components/ds/glass";
import { TopBar } from "@/components/ds/navigation";
import { EmptyState } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";
import { ImageViewer } from "@/components/ds/image-viewer";

export const Route = createFileRoute("/_authenticated/chat/$chatId/media")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(sharedMediaQuery(params.chatId)),
  pendingComponent: MediaSkeleton,
  errorComponent: MediaError,
  component: SharedMediaPage,
});

function SharedMediaPage() {
  const { chatId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: initial } = useSuspenseQuery(sharedMediaQuery(chatId));
  const loadMore = useServerFn(getSharedMedia);

  const [extra, setExtra] = useState<SharedMediaItem[]>([]);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [busy, setBusy] = useState(false);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);

  const items = [...initial.items, ...extra];

  useEffect(() => {
    const invalidate = () => qc.invalidateQueries({ queryKey: sharedMediaQuery(chatId).queryKey });
    const channel = supabase
      .channel(`chat-media:${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${chatId}` },
        invalidate,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, qc]);

  const onLoadMore = async () => {
    const last = items[items.length - 1];
    if (!last) return;
    setBusy(true);
    try {
      const res = await loadMore({ data: { chatId, before: last.createdAt } });
      setExtra((prev) => [...prev, ...res.items]);
      setHasMore(res.hasMore);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DiscoverShell active="matches">
      <TopBar title="Shared media" onBack={() => navigate({ to: "/chat/$chatId/info", params: { chatId } })} />

      {items.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
          <EmptyState
            scene="messages"
            tone="slate"
            title="No shared media yet"
            description="Photos you share in this conversation will appear here."
          />
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: spacing[1],
              marginTop: spacing[4],
            }}
          >
            {items.map((m) => (
              <button
                key={m.id}
                onClick={() => setViewerSrc(m.url)}
                aria-label="Open image"
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: radii.sm,
                  overflow: "hidden",
                  border: `1px solid ${surfaces.borderSoft}`,
                  background: surfaces.glass,
                }}
              >
                <img
                  src={m.url}
                  alt="Shared media"
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </button>
            ))}
          </div>

          {hasMore && (
            <div style={{ marginTop: spacing[4] }}>
              <Button variant="glass" fullWidth loading={busy} onClick={onLoadMore}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}

      {viewerSrc && <ImageViewer src={viewerSrc} onClose={() => setViewerSrc(null)} />}
    </DiscoverShell>
  );
}

/* --------------------------------------------------------------- states --- */

function MediaSkeleton() {
  return (
    <DiscoverShell active="matches">
      <TopBar title="Shared media" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: spacing[1],
          marginTop: spacing[4],
        }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} style={{ aspectRatio: "1 / 1", borderRadius: 12 }} />
        ))}
      </div>
    </DiscoverShell>
  );
}

function MediaError() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="matches">
      <TopBar title="Shared media" onBack={() => navigate({ to: "/chat" })} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyState
          scene="search"
          tone="slate"
          title="Couldn't load media"
          description="Something went wrong loading shared media. Try again in a moment."
          primaryAction={
            <Button variant="primary" fullWidth onClick={() => navigate({ to: "/chat" })}>
              Back to messages
            </Button>
          }
        />
      </div>
    </DiscoverShell>
  );
}
