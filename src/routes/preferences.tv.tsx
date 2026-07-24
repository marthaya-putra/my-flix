import { createFileRoute } from "@tanstack/react-router";
import { AllPreferencesPage } from "@/components/preferences/all-preferences-page";

/**
 * Auth guard + data prefetch live on the parent layout route
 * (preferences.tsx); this renders into the shell's <Outlet /> and reads state
 * from the shared PreferencesContext.
 */
export const Route = createFileRoute("/preferences/tv")({
  component: () => <AllPreferencesPage category="tvShows" />,
});
