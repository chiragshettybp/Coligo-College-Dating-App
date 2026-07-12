// ============================================================================
// useEmptyGuard — powers the /empty/* fallback routes. On mount it silently
// re-checks the live backend query; if data already exists it fires `onData`
// (which redirects back to the real module) so an empty state is never shown
// unnecessarily. A manual `refresh()` does the same but surfaces a toast when
// there is still nothing. Realtime INSERTs on the relevant tables re-run the
// check, so the empty state disappears automatically the moment content
// arrives. Composed only from existing app primitives.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

type AnyQuery = UseQueryOptions<any, any, any, any> & { queryKey: unknown[] };

export function useEmptyGuard<TData>({
  query,
  hasData,
  onData,
  tables,
  channel,
  emptyMessage = "Nothing new just yet — check back soon.",
}: {
  /** The same queryOptions the real module uses. */
  query: AnyQuery;
  /** Given the fresh query result, does content now exist? */
  hasData: (data: TData) => boolean;
  /** Called (once) when content exists — navigate back to the real module. */
  onData: () => void;
  /** Public tables whose INSERTs may resolve this empty state. */
  tables: string[];
  /** Unique realtime channel name. */
  channel: string;
  /** Toast shown when a manual refresh still finds nothing. */
  emptyMessage?: string;
}) {
  const qc = useQueryClient();
  const [checking, setChecking] = useState(false);
  const resolved = useRef(false);

  const check = useCallback(
    async (opts?: { silent?: boolean }): Promise<boolean> => {
      if (resolved.current) return true;
      if (!opts?.silent) setChecking(true);
      try {
        await qc.invalidateQueries({ queryKey: query.queryKey });
        const fresh = (await qc.fetchQuery(query)) as TData;
        if (hasData(fresh)) {
          resolved.current = true;
          onData();
          return true;
        }
        if (!opts?.silent) toast(emptyMessage);
        return false;
      } catch {
        if (!opts?.silent) toast.error("Couldn't refresh right now.");
        return false;
      } finally {
        setChecking(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qc],
  );

  // Confirm on mount: only show the empty state after verifying no data exists.
  useEffect(() => {
    void check({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: an INSERT on any watched table may now satisfy the query.
  useEffect(() => {
    const ch = supabase.channel(channel);
    for (const table of tables) {
      ch.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table },
        () => void check({ silent: true }),
      );
    }
    ch.subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { checking, refresh: () => check() };
}
