// Shared heading for auth screens — keeps every page visually identical.
import { Text } from "@/components/ds/glass";
import { colors, spacing } from "@/lib/ds";

export function AuthHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: spacing[4] }}>
      <Text variant="displaySm" color={colors.textPrimary}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>
          {subtitle}
        </Text>
      ) : null}
    </div>
  );
}
