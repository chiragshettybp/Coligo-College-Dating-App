// ============================================================================
// One-shot dev command: create/refresh the 10 seed student accounts.
//
//   npm run seed:students
//
// Config via environment variables:
//   SEED_SECRET   (required) — the same shared secret stored in the app's
//                              server secrets; authenticates the request.
//   SEED_URL      (optional) — base URL of a running app. Defaults to the
//                              local dev server at http://localhost:8080.
//
// Examples:
//   SEED_SECRET=... npm run seed:students
//   SEED_SECRET=... SEED_URL=https://project--<id>-dev.lovable.app npm run seed:students
// ============================================================================

const secret = process.env.SEED_SECRET;
if (!secret) {
  console.error(
    "\n✗ SEED_SECRET is not set.\n" +
      "  Run again with the shared secret, e.g.:\n" +
      "    SEED_SECRET=your-secret npm run seed:students\n",
  );
  process.exit(1);
}

const base = (process.env.SEED_URL ?? "http://localhost:8080").replace(/\/$/, "");
const endpoint = `${base}/api/public/seed/students`;

console.log(`→ Seeding 10 student accounts via ${endpoint} ...`);

try {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "x-seed-secret": secret, "content-type": "application/json" },
  });

  const text = await res.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }

  if (!res.ok) {
    console.error(`\n✗ Seed failed (HTTP ${res.status}):`);
    console.error(payload.error ?? payload.raw ?? text);
    process.exit(1);
  }

  console.log(
    `\n✓ Done — ${payload.total} accounts (${payload.created} created, ${payload.updated} updated)\n`,
  );
  for (const a of payload.accounts ?? []) {
    console.log(
      `  [${String(a.seq).padStart(2, "0")}] ${a.action.padEnd(7)} ${a.fullName} · ` +
        `${a.college ?? "—"} · ${a.department ?? "—"} · ` +
        `${a.photos} photos · ${a.interests} interests · ${a.email}`,
    );
  }
  console.log("");
} catch (err) {
  console.error("\n✗ Could not reach the seed endpoint.");
  console.error("  Make sure the app is running (npm run dev) or set SEED_URL.");
  console.error(`  ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
