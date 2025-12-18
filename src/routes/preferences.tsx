import { createFileRoute } from "@tanstack/react-router";
import { PreferencesPage } from "@/components/preferences/preferences-page";
import { onlyLoggedIn } from "@/middleware/auth";
import { fetchUserPreferences } from "@/lib/data/preferences";

export const Route = createFileRoute("/preferences")({
  component: PreferencesComponent,
  loader: async () => {
    const result = await fetchUserPreferences();
    return result.success ? result.data : undefined;
  },
  server: {
    middleware: [onlyLoggedIn],
  },
});

function PreferencesComponent() {
  const initialPreferences = Route.useLoaderData();
  return <PreferencesPage initialPreferences={initialPreferences} />;
}
