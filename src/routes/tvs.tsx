import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tvs")({
  component: TVShows,
});

function TVShows() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">TV Shows</h1>
      <p className="text-muted-foreground">Browse our TV show collection.</p>
    </div>
  );
}
