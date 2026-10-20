import { GuestList } from "@/components/GuestList";
import { buttonVariants } from "@/components/ui/button";
import type { GuestListSummary } from "@/lib/rsvp/guest-list";
import { adminRoutes } from "@/lib/routes";

const NOT_INCLUDED = "This plan does not include replies.";

/**
 * An invitation's replies in the editor. `summary` is null when the plan has no
 * replies, so the operator sees why there is no list instead of a bare gap.
 */
export function GuestsSection({
  invitationId,
  summary,
}: {
  invitationId: string;
  summary: GuestListSummary | null;
}) {
  return (
    <section className="grid gap-5 rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-[22px]">Guests</h2>
        {summary ? (
          <a
            className={buttonVariants({ variant: "outline", size: "sm" })}
            download
            href={adminRoutes.guestsExport(invitationId)}
          >
            Download CSV
          </a>
        ) : null}
      </div>
      {summary ? (
        <GuestList summary={summary} />
      ) : (
        <p className="text-muted-foreground">{NOT_INCLUDED}</p>
      )}
    </section>
  );
}
