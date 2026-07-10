import type { StreamStage } from "@/lib/data/stream-events";
import { cn } from "@/lib/utils";

const STAGE_LABELS: Record<StreamStage, string> = {
  finding_titles: "Finding titles",
  looking_up_posters: "Looking up posters & details",
  finalizing: "Finalizing",
};

interface LiveProgressHeaderProps {
  label: string;
  status: "pending" | "ok" | "error";
  stage?: StreamStage;
  found?: number;
  target?: number;
  count?: number;
}

export function LiveProgressHeader({
  label,
  status,
  stage,
  found,
  target,
  count,
}: LiveProgressHeaderProps) {
  if (status === "pending") {
    // Before the first progress event — show neutral loading label,
    // not the settled "· N picks" (avoids a brief "0 picks" flash).
    if (!stage || target == null || found == null) {
      return (
        <div className="space-y-1.5">
          <h2 className="text-lg md:text-xl font-display font-semibold text-white">
            {label}
          </h2>
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      );
    }

    const displayFound = Math.min(found, target);
    const pct = target > 0 ? (displayFound / target) * 100 : 0;

    return (
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg md:text-xl font-display font-semibold text-white">
            {label}
          </h2>
          <span className="text-sm text-muted-foreground tabular-nums">
            {STAGE_LABELS[stage]} · {displayFound} of {target}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  // Settled state
  return (
    <h2 className="text-lg md:text-xl font-display font-semibold text-white">
      {label} · {count ?? 0} picks
    </h2>
  );
}
