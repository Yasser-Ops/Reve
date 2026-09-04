import './invitation-demo.css';

/**
 * The guest's first thirty seconds, looping inside the phone on the marketing
 * page: a sealed envelope, the seal tapped, the flap falling, the card rising,
 * and then the invitation itself scrolled through the way a guest would.
 *
 * A server component on purpose. The whole sequence is CSS keyframes, so there
 * is no state, no effect, and no reason to ship a client island for it.
 *
 * The content is deliberately the same couple as the live example this section
 * links to, so the loop is a preview of that page rather than a different
 * invented one.
 */

/* One shared cycle length. Every layer's keyframes are expressed as
   percentages of this, so changing the tempo here re-times the whole sequence
   without touching a single keyframe. */
const CYCLE_MS = 11000;

/* How far the invitation travels upward through the screen. Must exceed the
   card's overflow beyond the viewport or the scroll stops short of the end. */
const TRAVEL = '52%';

const SCHEDULE = [
  { time: '4:30', event: 'Ceremony' },
  { time: '6:00', event: 'Cocktails' },
  { time: '8:00', event: 'Dinner' },
];

export function InvitationDemo() {
  return (
    <div
      aria-hidden="true"
      className="demo grid aspect-9/16 select-none"
      style={
        {
          '--demo-cycle': `${CYCLE_MS}ms`,
          '--demo-travel': TRAVEL,
        } as React.CSSProperties
      }
    >
      {/* Stage one: the sealed envelope, opened by the seal. */}
      <div className="demo-stage">
        <div className="demo-envelope">
          <div className="demo-body" />
          <div className="demo-card" />

          <div className="demo-flap">
            <svg preserveAspectRatio="none" viewBox="0 0 300 124">
              <path d="M0 0 H300 L150 124 Z" fill="#ded2c2" />
              <path
                d="M0 0 H300 L150 124 Z"
                fill="none"
                stroke="rgb(28 28 30 / 0.08)"
              />
            </svg>
          </div>

          <div className="demo-front" />

          <div className="demo-seal">
            <span className="reve-display ps-[0.14em] text-[11px] tracking-[0.14em]">
              SA
            </span>
          </div>
        </div>
      </div>

      {/* Stage two: the invitation, travelling up through the screen. */}
      <div className="demo-scroll px-7 pb-10 pt-12 text-center text-ink">
        <p className="reve-eyebrow text-[9px] text-cocoa">Together with their families</p>

        <h3 className="reve-display mt-5 text-[26px] leading-[1.15]">
          Sarah
          <span
            className="mx-1.5 text-wine"
            style={{ fontFamily: 'var(--font-accent)', fontStyle: 'italic' }}
          >
            &amp;
          </span>
          Amine
        </h3>

        <div className="mx-auto mt-5 h-px w-10 bg-taupe/60" />

        <p className="reve-numeral mt-5 text-[11px] tracking-[0.14em] text-cocoa">
          12 · 07 · 2026
        </p>

        <p className="reve-eyebrow mt-9 text-[9px] text-cocoa">The day</p>

        <ul className="mx-auto mt-4 w-full max-w-[9rem] space-y-2">
          {SCHEDULE.map((entry) => (
            <li
              className="flex items-baseline justify-between border-b border-taupe/30 pb-1.5"
              key={entry.event}
            >
              <span className="reve-numeral text-[10px] text-cocoa">
                {entry.time}
              </span>
              <span className="reve-crisp text-[10px] text-ink">
                {entry.event}
              </span>
            </li>
          ))}
        </ul>

        <p className="reve-eyebrow mt-9 text-[9px] text-cocoa">Will you join us</p>

        <span className="reve-crisp mt-4 inline-block rounded-full bg-wine px-5 py-2 text-[9px] uppercase tracking-[0.16em] text-bone">
          RSVP
        </span>
      </div>
    </div>
  );
}
