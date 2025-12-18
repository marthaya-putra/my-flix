import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { Await } from "@tanstack/react-router";
import { PreferencesPage } from "@/components/preferences/preferences-page";
import { onlyLoggedIn } from "@/middleware/auth";
import { fetchUserPreferences } from "@/lib/data/preferences";

export const Route = createFileRoute("/preferences")({
  component: PreferencesComponent,
  loader: async () => {
    return {
      preferencesPromise: fetchUserPreferences(),
    };
  },
  server: {
    middleware: [onlyLoggedIn],
  },
});

function PreferencesComponent() {
  const { preferencesPromise } = Route.useLoaderData();

  return (
    <Suspense fallback={<PreferencesSkeleton />}>
      <Await promise={preferencesPromise}>
        {(preferences) => <PreferencesPage initialPreferences={preferences} />}
      </Await>
    </Suspense>
  );
}

function PreferencesSkeleton() {
  return (
    <div className="container mx-auto p-4 max-w-6xl animate-pulse">
      <div className="mb-8">
        <div className="h-10 bg-muted rounded-lg w-64 mb-2"></div>
        <div className="h-4 bg-muted rounded-lg w-96"></div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-card rounded-lg p-6">
          <div className="h-6 bg-muted rounded-lg w-48 mb-2"></div>
          <div className="h-4 bg-muted rounded-lg w-96 mb-6"></div>

          <div className="flex space-x-1 mb-6">
            <div className="h-10 bg-muted rounded-lg w-16"></div>
            <div className="h-10 bg-muted rounded-lg w-20"></div>
            <div className="h-10 bg-muted rounded-lg w-24"></div>
            <div className="h-10 bg-muted rounded-lg w-20"></div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="h-5 bg-muted rounded-lg w-20"></div>
                <div className="h-8 bg-muted rounded-lg w-16"></div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="h-24 w-32 bg-muted rounded-lg"></div>
                <div className="h-24 w-32 bg-muted rounded-lg"></div>
                <div className="h-24 w-32 bg-muted rounded-lg"></div>
                <div className="h-24 w-32 bg-muted rounded-lg"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="h-5 bg-muted rounded-lg w-24"></div>
                <div className="h-8 bg-muted rounded-lg w-16"></div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="h-24 w-32 bg-muted rounded-lg"></div>
                <div className="h-24 w-32 bg-muted rounded-lg"></div>
                <div className="h-24 w-32 bg-muted rounded-lg"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="h-5 bg-muted rounded-lg w-20"></div>
                <div className="h-8 bg-muted rounded-lg w-16"></div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="h-24 w-32 bg-muted rounded-lg"></div>
                <div className="h-24 w-32 bg-muted rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
