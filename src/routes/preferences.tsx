import { createFileRoute } from "@tanstack/react-router";
import { PreferencesPage } from "@/components/preferences/preferences-page";
import { authMiddleware } from "@/middleware/auth";

export const Route = createFileRoute("/preferences")({
  component: PreferencesComponent,
  server: {
    middleware: [authMiddleware],
  },
});

function PreferencesComponent() {
  return <PreferencesPage />;
}
