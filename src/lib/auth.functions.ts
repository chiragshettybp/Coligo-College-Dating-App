// ============================================================================
// Auth server functions — account creation, availability check, dev-mode reset.
// These use the admin client so signup works regardless of email-confirmation
// settings and needs no SMS provider. Admin client is imported INSIDE handlers
// so this client-reachable module never ships server-only code to the browser.
// ============================================================================
import { createServerFn } from "@tanstack/react-start";

import { signupSchema, resetSchema, phoneToAlias, toE164, OTP_ENABLED } from "./auth";

// -------------------------------------------------------- checkPhoneAvailable
export const checkPhoneAvailable = createServerFn({ method: "POST" })
  .inputValidator((input) => ({ phone: String((input as { phone?: unknown })?.phone ?? "") }))
  .handler(async ({ data }): Promise<{ available: boolean }> => {
    const e164 = toE164(data.phone);
    const digits = e164.replace(/\D/g, "");
    if (digits.length !== 12) return { available: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("phone", e164);
    if (error) throw new Error(error.message);
    return { available: (count ?? 0) === 0 };
  });

// -------------------------------------------------------------- signUpWithPhone
export const signUpWithPhone = createServerFn({ method: "POST" })
  .inputValidator((input) => signupSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true; alias: string }> => {
    const alias = phoneToAlias(data.phone);
    const e164 = toE164(data.phone);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Reject duplicates up-front for a clean signup UX.
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("phone", e164);
    if ((count ?? 0) > 0) {
      throw new Error("An account with this number already exists.");
    }

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: alias,
      password: data.password,
      email_confirm: true, // no confirmation step needed for phone-alias accounts
      user_metadata: { phone: e164 },
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        throw new Error("An account with this number already exists.");
      }
      throw new Error(error.message);
    }
    return { ok: true, alias };
  });

// ---------------------------------------------------------- resetPasswordByPhone
// DEV-MODE recovery: while OTP/SMS is disabled there is no channel to prove
// ownership of a number, so this resets the password after only checking the
// number exists. This is intentionally NOT production-safe and is hard-gated to
// OTP_ENABLED === false — enabling OTP disables this path automatically.
export const resetPasswordByPhone = createServerFn({ method: "POST" })
  .inputValidator((input) => resetSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true; alias: string }> => {
    if (OTP_ENABLED) {
      throw new Error("Password recovery must go through OTP verification.");
    }
    const alias = phoneToAlias(data.phone);
    const e164 = toE164(data.phone);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", e164)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile) throw new Error("No account found for this mobile number.");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true, alias };
  });
