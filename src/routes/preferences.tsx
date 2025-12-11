import { createFileRoute } from "@tanstack/react-router";
import { PreferencesPage } from "@/components/preferences/preferences-page";
import { onlyLoggedIn } from "@/middleware/auth";

export const Route = createFileRoute("/preferences")({
  component: PreferencesComponent,
  server: {
    middleware: [onlyLoggedIn],
  },
});

function PreferencesComponent() {
  return <PreferencesPage />;
}
