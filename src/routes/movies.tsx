import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/movies")({
  component: Movies,
});

function Movies() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Movies</h1>
      <p className="text-muted-foreground">Browse our movie collection.</p>
    </div>
  );
}