// ============================================================================
// /empty/no-chats — fallback shown when the user has no conversations. Confirms
// against the live chat list before rendering; redirects to /chat if any exist.
// Realtime resolves the state when a new match or message creates a thread.
// Design-system only.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { chatListQuery, type ChatListItem } from "@/lib/chat.functions";
import { useEmptyGuard } from "@/lib/use-empty-guard";
import { spacing } from "@/lib/ds";
import { Button } from "@/components/ds/glass";
import { EmptyState } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/empty/no-chats")({
  component: NoChatsPage,
});

function NoChatsPage() {
  const navigate = useNavigate();
  const { checking, refresh } = useEmptyGuard<ChatListItem[]>({
    query: chatListQuery(),
    hasData: (c) => c.length > 0,
    onData: () => navigate({ to: "/chat", replace: true }),
    tables: ["matches", "messages"],
    channel: "empty:no-chats",
    emptyMessage: "No conversations yet — say hello to a match!",
  });

  return (
    <DiscoverShell active="chat">
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyState
          scene="messages"
          tone="primary"
          title="No conversations yet"
          description="Chats begin after you match. Once you connect with someone, break the ice and your conversations will live here."
          primaryAction={
            <Button variant="primary" fullWidth onClick={() => navigate({ to: "/matches" })}>
              View matches
            </Button>
          }
          secondaryAction={
            <>
              <Button variant="ghost" fullWidth onClick={() => navigate({ to: "/discover" })}>
                Start swiping
              </Button>
              <Button variant="ghost" fullWidth loading={checking} onClick={refresh}>
                Refresh
              </Button>
              <Button variant="ghost" fullWidth onClick={() => navigate({ to: "/home" })}>
                Go home
              </Button>
            </>
          }
        />
      </div>
    </DiscoverShell>
  );
}
