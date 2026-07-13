// ============================================================================
// Admin-only action: seed 10 fully-built demo student accounts.
// Gated by requireSupabaseAuth + has_role('admin') so only admins can run it.
// The heavy lifting (service-role auth/profile/photo writes) lives in the
// server-only helper, imported inside the handler to keep it off the client.
// ============================================================================
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SeedSummary } from "@/lib/seed-students.server";

export const seedDemoStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SeedSummary> => {
    const { supabase, userId } = context;
    const { data: isAdmin, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (error) throw new Error(error.message);
    if (isAdmin !== true) throw new Error("Forbidden");

    const { seedStudents } = await import("@/lib/seed-students.server");
    return seedStudents();
  });
