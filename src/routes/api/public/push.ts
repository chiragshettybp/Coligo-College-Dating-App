// ============================================================================
// POST /api/public/push — background web-push fan-out.
// Called server-to-server by the `notify_push` DB trigger (via pg_net) whenever
// a notification row is inserted. Verifies a shared secret, loads the
// notification with the service-role client, and delivers a web-push message to
// every registered browser subscription for the recipient. Dead subscriptions
// (404/410) are pruned. This route is intentionally public but secret-gated.
// ============================================================================
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-push-secret");
        if (!secret || secret !== process.env.PUSH_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: { notificationId?: string };
        try {
          body = (await request.json()) as { notificationId?: string };
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        const notificationId = body.notificationId;
        if (!notificationId) return new Response("Bad request", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: notif } = await supabaseAdmin
          .from("notifications")
          .select("id, user_id, type, title, body, data")
          .eq("id", notificationId)
          .single();
        if (!notif) return new Response("ok");

        const { data: tokens } = await supabaseAdmin
          .from("device_tokens")
          .select("id, token")
          .eq("user_id", notif.user_id)
          .eq("platform", "web");
        if (!tokens?.length) return new Response("ok");

        const webpush = (await import("web-push")).default;
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT || "mailto:support@coligo.app",
          process.env.VAPID_PUBLIC_KEY!,
          process.env.VAPID_PRIVATE_KEY!,
        );

        const payload = JSON.stringify({
          title: notif.title,
          body: notif.body,
          type: notif.type,
          data: notif.data ?? {},
        });

        await Promise.all(
          tokens.map(async (t) => {
            try {
              const sub = JSON.parse(t.token as string);
              await webpush.sendNotification(sub, payload);
            } catch (e) {
              const code = (e as { statusCode?: number })?.statusCode;
              if (code === 404 || code === 410) {
                await supabaseAdmin.from("device_tokens").delete().eq("id", t.id);
              }
            }
          }),
        );

        return new Response("ok");
      },
    },
  },
});
