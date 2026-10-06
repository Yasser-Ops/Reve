import Link from 'next/link';
import { CLIENT_VIEWS, type ClientView } from '@/lib/admin/summary';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

const TILES: { view: ClientView; label: string }[] = [
  { view: CLIENT_VIEWS.ACTIVE, label: 'Active' },
  { view: CLIENT_VIEWS.DUE, label: 'Due in 48h' },
  { view: CLIENT_VIEWS.OVERDUE, label: 'Overdue' },
  { view: CLIENT_VIEWS.REVIEW, label: 'Awaiting approval' },
];

/** The guest-list card's counter row, reused for the studio's own numbers. */
export function SummaryTiles({
  counts,
  current,
}: {
  counts: Record<ClientView, number>;
  current: ClientView | undefined;
}) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-2xl border bg-card sm:grid-cols-4">
      {TILES.map((tile) => {
        const active = current === tile.view;
        return (
          <Link
            aria-current={active ? 'true' : undefined}
            className={cn(
              'border-b p-5 transition-colors odd:border-r hover:bg-muted sm:border-r sm:border-b-0 sm:last:border-r-0',
              active && 'bg-muted',
            )}
            href={active ? ROUTES.ADMIN : `${ROUTES.ADMIN}?view=${tile.view}`}
            key={tile.view}
          >
            <span
              className={cn(
                'block text-[32px] leading-none',
                tile.view === CLIENT_VIEWS.OVERDUE && counts.overdue > 0 && 'text-wine',
              )}
            >
              {counts[tile.view]}
            </span>
            <span className="mt-3 block text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {tile.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
