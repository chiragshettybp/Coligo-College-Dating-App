// ============================================================================
// /chat — layout route for the Chat module. Children (inbox, conversation,
// info, media, report) render through the Outlet. Auth is enforced by the
// parent _authenticated layout.
// ============================================================================
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/chat")({
  component: () => <Outlet />,
});
