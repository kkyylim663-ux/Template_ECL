/** Loading placeholder. Pulse stops under `prefers-reduced-motion` (globals.css). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton bg-panel-soft rounded-[var(--radius-tag)] ${className ?? ''}`}
    />
  );
}

/** Card-shaped skeleton matching the game grid footprint. */
export function GameCardSkeleton() {
  return (
    <div className="border-line bg-panel rounded-[var(--radius-panel)] border p-2">
      <Skeleton className="aspect-[3/4] w-full" />
      <Skeleton className="mx-auto mt-3 h-3 w-2/3" />
    </div>
  );
}
