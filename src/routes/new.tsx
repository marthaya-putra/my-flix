import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/new")({
  component: NewPopular,
});

function NewPopular() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">New & Popular</h1>
      <p className="text-muted-foreground">Check out the latest and trending content.</p>
    </div>
  );
}