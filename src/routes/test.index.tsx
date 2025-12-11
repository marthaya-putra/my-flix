import { loadPreferences } from "@/components/preferences/use-preferences";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/test/")({
  component: RouteComponent,
  loader: async () => {
    const pref = await loadPreferences();
    return pref;
  },
});

function RouteComponent() {
  const data = Route.useLoaderData();
  return <div>{JSON.stringify(data)}</div>;
}
