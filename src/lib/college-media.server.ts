// ============================================================================
// Server-only helpers for signing college logo / banner storage paths.
// Kept out of the *.functions file so the server-fn code-splitter never strips
// a sibling reference. Full https URLs (legacy seed data) pass through untouched.
// ============================================================================
export const LOGO_BUCKET = "college-logos";
export const BANNER_BUCKET = "college-banners";
const SIGN_TTL = 3600;

type SignerClient = {
  storage: {
    from: (b: string) => {
      createSignedUrls: (
        paths: string[],
        ttl: number,
      ) => Promise<{ data: { path: string | null; signedUrl: string | null }[] | null }>;
    };
  };
};

/** Batch-sign paths in a single bucket. Full https URLs are skipped. */
export async function signBucketPaths(
  client: SignerClient,
  bucket: string,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const toSign = Array.from(new Set(paths.filter((p): p is string => !!p && !p.startsWith("http"))));
  const map = new Map<string, string>();
  if (toSign.length === 0) return map;
  const { data } = await client.storage.from(bucket).createSignedUrls(toSign, SIGN_TTL);
  for (const row of data ?? []) {
    if (row.signedUrl && row.path) map.set(row.path, row.signedUrl);
  }
  return map;
}

export function resolveMediaUrl(raw: string | null | undefined, signed: Map<string, string>): string | null {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return signed.get(raw) ?? null;
}
