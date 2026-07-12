// ============================================================================
// Contact form server function — validates and stores a support request.
// Uses the server publishable client (anon) which is gated by an INSERT RLS
// policy on public.contact_messages.
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

export const CONTACT_CATEGORIES = [
  "general",
  "support",
  "safety",
  "verification",
  "partnership",
  "feedback",
] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z
    .string()
    .trim()
    .min(3, "Enter a valid email")
    .max(320)
    .email("Enter a valid email"),
  subject: z.string().trim().min(1, "Please add a subject").max(200),
  category: z.enum(CONTACT_CATEGORIES),
  message: z
    .string()
    .trim()
    .min(10, "Please write at least 10 characters")
    .max(4000),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((input) => contactSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true; id: string }> => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const userAgent = getRequestHeader("user-agent") ?? null;

    const { data: row, error } = await supabase
      .from("contact_messages")
      .insert({
        name: data.name,
        email: data.email,
        subject: data.subject,
        category: data.category,
        message: data.message,
        status: "new",
        user_agent: userAgent,
        source: "web",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });
