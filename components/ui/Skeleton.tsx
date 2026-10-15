/** Loading placeholder. Pulse stops under `prefers-reduced-motion` (globals.css). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton bg-panel-soft rounded-[var(--radius-tag)] ${className ?? ''}`}
    />
  );
}

/** Card-shaped skeleton matching the game grid footprint (`.lobby-card`). */
export function GameCardSkeleton() {
  return (
    <div className="lobby-card">
      <Skeleton className="h-full w-full rounded-[var(--radius-panel)]" />
    </div>
  );
}
