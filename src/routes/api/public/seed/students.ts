// ============================================================================
// POST /api/public/seed/students — development-only student seeder endpoint.
//
// SECURITY: gated by the SEED_SECRET shared secret (sent as x-seed-secret or
// Authorization: Bearer). The service-role work happens in the server runtime
// only; the secret prevents anyone else from triggering it on a published site.
// Intended for one-off dev use via `npm run seed:students`.
// ============================================================================
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function extractSecret(request: Request): string {
  const header = request.headers.get("x-seed-secret");
  if (header) return header;
  const auth = request.headers.get("authorization") ?? "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
}

export const Route = createFileRoute("/api/public/seed/students")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SEED_SECRET;
        if (!expected) {
          return Response.json(
            { error: "SEED_SECRET is not configured on the server." },
            { status: 500 },
          );
        }
        const provided = extractSecret(request);
        if (!provided || !safeEqual(provided, expected)) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const { seedStudents } = await import("@/lib/seed-students.server");
          const summary = await seedStudents();
          return Response.json(summary);
        } catch (error) {
          console.error("[seed:students]", error);
          return Response.json(
            { error: error instanceof Error ? error.message : "Seed failed." },
            { status: 500 },
          );
        }
      },
    },
  },
});
