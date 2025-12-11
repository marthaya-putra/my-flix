import { createFileRoute } from "@tanstack/react-router";
import { PreferencesPage } from "@/components/preferences/preferences-page";
import { onlyLoggedIn } from "@/middleware/auth";
import { fetchUserPreferences } from "@/lib/data/preferences";

export const Route = createFileRoute("/preferences")({
  component: PreferencesComponent,
  loader: async () => {
    const pref = await fetchUserPreferences();
    return pref;
  },
});

function PreferencesComponent() {
  const data = Route.useLoaderData();
  return <div>{JSON.stringify(data)}</div>;
}
