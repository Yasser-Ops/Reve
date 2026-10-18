import type { ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';

type LockedCardProps = {
  title: string;
  children: ReactNode;
  actionLabel: string;
  actionHref: string;
};

/** A part of the portal the client's plan does not include yet, with the way to add it. */
export function LockedCard({ title, children, actionLabel, actionHref }: LockedCardProps) {
  return (
    <section className="grid gap-3 rounded-xl border border-dashed bg-muted/40 p-4">
      <h3 className="font-heading text-lg">{title}</h3>
      <p className="text-muted-foreground">{children}</p>
      <a
        className={buttonVariants({ variant: 'outline', className: 'justify-self-start' })}
        href={actionHref}
        rel="noreferrer"
        target="_blank"
      >
        {actionLabel}
      </a>
    </section>
  );
}
