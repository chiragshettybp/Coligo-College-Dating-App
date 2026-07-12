// /admin — send to the dashboard; the dashboard guard bounces non-admins to login.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/dashboard" });
  },
});
