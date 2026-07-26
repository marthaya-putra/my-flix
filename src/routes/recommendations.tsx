import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/recommendations")({
  component: RecommendationsLayout,
});

// Layout route: renders the static page header around every child state
// (pending, error, and the three resolved cases). The child route
// (recommendations.index) owns the loader and pending/error components;
// this layout is loader-less so it paints immediately with no pop-in.
//
// The flex column + minHeight lets the resolved state's <Laser> (which owns
// its own scroll region, like ParticleScroll on /) fill the remaining viewport
// via h-full. Shorter states (error, empty) render at natural height without
// forcing body scroll.
function RecommendationsLayout() {
  return (
    <div
      className="container mx-auto p-4 mt-8 flex flex-col"
      style={{ minHeight: "calc(100dvh - 72px)" }}
    >
      <header className="mb-8 shrink-0">
        <h1 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent tracking-tight">
          Your Picks, Reimagined
        </h1>
        <p className="mt-2 text-muted-foreground max-w-xl">
          Built from everything you love.
        </p>
      </header>
      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
    </div>
  );
}
