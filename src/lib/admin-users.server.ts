// ============================================================================
// Server-only helpers for the admin user module. Kept out of the *.functions
// file so the server-fn code-splitter never strips a sibling reference.
// ============================================================================
const BUCKET = "profile-photos";
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

/** Batch-sign private storage paths. Full https URLs pass through untouched. */
export async function signAdminPaths(
  client: SignerClient,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const toSign = Array.from(new Set(paths.filter((p): p is string => !!p && !p.startsWith("http"))));
  const map = new Map<string, string>();
  if (toSign.length === 0) return map;
  const { data } = await client.storage.from(BUCKET).createSignedUrls(toSign, SIGN_TTL);
  for (const row of data ?? []) {
    if (row.signedUrl && row.path) map.set(row.path, row.signedUrl);
  }
  return map;
}

export function resolveAdminUrl(raw: string | null | undefined, signed: Map<string, string>): string | null {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return signed.get(raw) ?? null;
}
