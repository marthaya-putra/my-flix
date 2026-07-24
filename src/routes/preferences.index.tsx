import { createFileRoute } from "@tanstack/react-router";
import { PreferencesPage } from "@/components/preferences/preferences-page";

/**
 * Index of /preferences. Auth guard + data prefetch live on the parent
 * layout route (preferences.tsx); this component renders into the shell's
 * <Outlet /> and reads state from the shared PreferencesContext.
 */
export const Route = createFileRoute("/preferences/")({
  component: PreferencesPage,
});
