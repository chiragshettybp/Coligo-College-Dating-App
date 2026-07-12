// ============================================================================
// Account lifecycle — privileged server function for permanent account
// deletion. Runs as the authenticated user (requireSupabaseAuth) but escalates
// to the service-role admin client (loaded inside the handler) to purge storage
// objects and remove the auth user. The auth user delete cascades to profiles
// and all owned rows via ON DELETE CASCADE foreign keys.
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "profile-photos";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { feedback?: string }) =>
    z.object({ feedback: z.string().trim().max(1000).optional().default("") }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Soft-flag first so the account is treated as deleted even if a later
    //    step fails partway (login / discovery already respect account_status).
    await supabaseAdmin
      .from("profiles")
      .update({ account_status: "deleted" })
      .eq("id", userId);

    // 2. Purge storage objects owned by the user (photos are stored under the
    //    user id folder in profile-photos).
    const { data: photos } = await supabaseAdmin
      .from("photos")
      .select("storage_path")
      .eq("user_id", userId);
    const paths = (photos ?? [])
      .map((p) => p.storage_path)
      .filter((p): p is string => !!p && !/^https?:\/\//.test(p));
    if (paths.length > 0) {
      await supabaseAdmin.storage.from(BUCKET).remove(paths);
    }

    // 3. Remove device sessions / push tokens so no further pushes are sent.
    await Promise.all([
      supabaseAdmin.from("device_sessions").delete().eq("user_id", userId),
      supabaseAdmin.from("device_tokens").delete().eq("user_id", userId),
    ]);

    // 4. Optional exit feedback (best-effort, never blocks deletion).
    if (data.feedback) {
      await supabaseAdmin.from("system_logs").insert({
        event_type: "account_deleted",
        referrer: data.feedback.slice(0, 1000),
        user_id: userId,
      });
    }

    // 5. Permanently remove the auth user — cascades to all owned rows.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
