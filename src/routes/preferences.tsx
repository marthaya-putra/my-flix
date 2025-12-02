import { createFileRoute } from "@tanstack/react-router";
import { PreferencesPage } from "@/components/preferences/preferences-page";

export const Route = createFileRoute("/preferences")({
  component: PreferencesComponent,
});

function PreferencesComponent() {
  return <PreferencesPage />;
}