/**
 * The guest list as the couple sees it.
 *
 * Rêve sells RSVP collection and a private dashboard on the Managed tier and
 * had only ever described them in bullets. This shows the thing: replies as
 * they arrive, a headcount that adds itself up, and the dietary notes that are
 * the actual reason a couple wants any of this.
 *
 * Every column shown here exists on the rsvps table (name, attending,
 * party_size, dietary_notes), so the panel promises nothing the schema cannot
 * already deliver. Keep it that way: this is marketing, and marketing that
 * outruns the product becomes a support ticket.
 *
 * Not interactive. It is a picture of a dashboard, not a dashboard, and it
 * should not grow buttons that do nothing.
 */

type Reply = {
  name: string;
  attending: boolean;
  partySize: number;
  note?: string;
  /** How long ago the reply landed. Relative, so it never looks stale. */
  when: string;
};

/* Deliberately mixed: a decline, a plus-one, and a dietary note, because a
   list of nothing but cheerful yeses would not look like a real one. */
const REPLIES: readonly Reply[] = [
  { name: 'Rita Haddad', attending: true, partySize: 2, when: '2m' },
  {
    name: 'Karim Aoun',
    attending: true,
    partySize: 1,
    note: 'Vegetarian',
    when: '18m',
  },
  { name: 'Maya Khoury', attending: false, partySize: 1, when: '1h' },
  {
    name: 'Georges Semaan',
    attending: true,
    partySize: 4,
    note: 'One high chair',
    when: '3h',
  },
  { name: 'Layal Nassar', attending: true, partySize: 2, when: '5h' },
];

const ATTENDING = REPLIES.filter((reply) => reply.attending);

const STATS = [
  {
    label: 'Attending',
    value: ATTENDING.reduce((total, reply) => total + reply.partySize, 0),
  },
  { label: 'Replied', value: REPLIES.length },
  { label: 'Awaiting', value: 63 },
];

export function RsvpPanel() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-md select-none overflow-hidden rounded-2xl border border-taupe/50 bg-bone shadow-[0_24px_50px_-26px_rgb(var(--reve-shadow-rgb)/0.45)]"
    >
      {/* Title bar */}
      <div className="flex items-baseline justify-between gap-4 border-b border-taupe/40 px-5 py-4">
        <p className="reve-display text-[15px]">Sarah &amp; Amine</p>
        <p className="reve-eyebrow text-[9px] text-taupe">Guest list</p>
      </div>

      {/* Headcount. The number a couple actually opens this to see, so it is
          the largest thing on the panel. */}
      <div className="grid grid-cols-3 divide-x divide-taupe/30 border-b border-taupe/40">
        {STATS.map((stat) => (
          <div className="px-5 py-4" key={stat.label}>
            <p className="reve-numeral text-2xl text-ink">{stat.value}</p>
            <p className="reve-eyebrow mt-1.5 text-[9px] text-cocoa">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Replies */}
      <ul className="divide-y divide-taupe/25">
        {REPLIES.map((reply) => (
          <li
            className="flex items-center gap-3 px-5 py-3"
            key={reply.name}
          >
            {/* Status reads as shape and colour together, not colour alone. */}
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] leading-none ${
                reply.attending
                  ? 'bg-wine/10 text-wine'
                  : 'bg-taupe/20 text-taupe'
              }`}
            >
              {reply.attending ? '✓' : '—'}
            </span>

            <span className="min-w-0 flex-1">
              <span className="reve-crisp block truncate text-[13.5px] text-ink">
                {reply.name}
              </span>
              {reply.note ? (
                <span className="reve-crisp block truncate text-[11.5px] text-cocoa">
                  {reply.note}
                </span>
              ) : null}
            </span>

            <span className="reve-numeral shrink-0 text-[12.5px] text-cocoa">
              {reply.attending ? `+${reply.partySize}` : ''}
            </span>

            <span className="reve-numeral w-8 shrink-0 text-end text-[11px] text-taupe">
              {reply.when}
            </span>
          </li>
        ))}
      </ul>

      <div className="border-t border-taupe/40 px-5 py-3.5">
        <p className="reve-crisp text-[11.5px] text-cocoa">
          Updates as guests reply. Export to Excel whenever you need it.
        </p>
      </div>
    </div>
  );
}
