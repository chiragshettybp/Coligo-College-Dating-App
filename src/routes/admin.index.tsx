// /admin — send to the dashboard; the dashboard guard bounces non-admins to login.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Login — Coligo" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/admin/dashboard" });
  },
});
