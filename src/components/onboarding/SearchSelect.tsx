// ============================================================================
// SearchSelect — instant client-side search over a Supabase-loaded list.
// Handles loading (skeleton), empty, and error+retry states.
// ============================================================================
import { useMemo, useState } from "react";
import { Search, Check, RefreshCw } from "lucide-react";

import { Text, Button, Skeleton } from "@/components/ds/glass";
import { colors, radii, surfaces, spacing, shadows } from "@/lib/ds";

export type SearchItem = { id: string; name: string; subtitle?: string | null };

export function SearchSelect({
  items,
  value,
  onChange,
  placeholder,
  loading,
  error,
  onRetry,
  emptyText = "No results found.",
}: {
  items: SearchItem[];
  value: string | null;
  onChange: (id: string) => void;
  placeholder: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyText?: string;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term ? items.filter((i) => i.name.toLowerCase().includes(term)) : items;
    return list.slice(0, 60);
  }, [q, items]);

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: spacing[6] }}>
        <Text variant="body" tone="secondary" style={{ marginBottom: spacing[3] }}>
          {error}
        </Text>
        {onRetry ? (
          <Button variant="secondary" leftIcon={<RefreshCw style={{ width: 16, height: 16 }} />} onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div
        className="flex items-center"
        style={{
          gap: spacing[1],
          padding: "0 14px",
          borderRadius: radii.md,
          background: surfaces.glassSoft,
          border: `1px solid ${surfaces.border}`,
          marginBottom: spacing[2],
        }}
      >
        <Search style={{ width: 18, height: 18, color: colors.textMuted }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            padding: "13px 4px",
            fontSize: 16,
            color: colors.textPrimary,
          }}
        />
      </div>

      <div style={{ display: "grid", gap: spacing[1], maxHeight: 340, overflowY: "auto", paddingRight: 2 }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 56, borderRadius: radii.md }} />
          ))
        ) : filtered.length === 0 ? (
          <Text variant="body" tone="muted" style={{ padding: spacing[4], textAlign: "center" }}>
            {emptyText}
          </Text>
        ) : (
          filtered.map((item) => {
            const selected = value === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className="flex items-center w-full text-left active:scale-[0.99]"
                style={{
                  gap: spacing[2],
                  padding: spacing[3],
                  borderRadius: radii.md,
                  background: surfaces.glassSoft,
                  border: `1.5px solid ${selected ? colors.primary : surfaces.border}`,
                  boxShadow: selected ? shadows.primaryGlow : "none",
                  transition: "all 140ms ease",
                  cursor: "pointer",
                }}
              >
                <span style={{ flex: 1 }}>
                  <Text variant="title" color={colors.textPrimary}>
                    {item.name}
                  </Text>
                  {item.subtitle ? (
                    <Text variant="bodySm" tone="secondary">
                      {item.subtitle}
                    </Text>
                  ) : null}
                </span>
                {selected ? <Check style={{ width: 20, height: 20, color: colors.primary }} /> : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
