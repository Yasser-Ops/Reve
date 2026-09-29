import type { InvitationContent } from '@/lib/schemas/invitation';

type ScheduleItem = InvitationContent['schedule'][number];

/**
 * The evening as a path through the garden: one winding line down the page
 * with a small bloom at each hour.
 *
 * A Server Component, unlike Lin's timeline. Lin tracks scroll to advance a
 * progress dot, which needs a client boundary and a rAF loop; Jardin's path is
 * drawn complete from the first paint, because the garden is already there
 * when you arrive and lighting it up as you walk would be a different, more
 * mechanical idea than this design wants. Nothing here needs the browser, so
 * nothing here ships JavaScript.
 *
 * The line is a single SVG path behind the list rather than a border on each
 * item: a per-item border gives straight segments with visible joins, and the
 * whole point is that it meanders.
 */
export function GardenPath({
  items,
  ink,
  accent,
}: {
  items: readonly ScheduleItem[];
  ink: string;
  accent: string;
}) {
  return (
    <ol className="relative mx-auto w-full max-w-xl">
      {/* The vine. Stretched to the list's height so it spans however many
          hours the evening has, and pinned to the left gutter the blooms sit
          in. `preserveAspectRatio="none"` is deliberate: this is a rule, not a
          drawing, and it should stretch rather than scale.

          IT ENDS ON THE LAST BLOOM, and the inset is MEASURED rather than
          guessed. `bottom-8` left the line running past the evening's final
          hour and — the list ending within a pixel of its section — straight
          into the next section's ground as a stray stroke.

          The last item is taller than its own bloom: the bloom's centre sits
          64px above the list's bottom edge, because the hour's title and
          description run on below it. `bottom-16` is that 64px, so the vine
          terminates where the last bloom is rather than where the last
          paragraph happens to end.

          The inset is on the BOX, not the path: the path is stretched to
          whatever height the list takes, so a shorter path would simply be
          stretched back across the same gap.

          THE HEIGHT IS SET, not inferred from a top/bottom pair. An SVG
          carrying a viewBox has an INTRINSIC height and sizes to it — 600px
          here — in preference to resolving `top` against `bottom`, and
          `h-auto` resolves to that same intrinsic height rather than
          releasing it. So the box overhung a 553px list by 79px and no
          combination of insets moved it by a pixel.

          `h-[calc(100%-6rem)]` is the 32px top inset plus the 64px that
          clears the last item's text, taken off the list's own height. */}
      <svg
        aria-hidden
        className="absolute left-[14px] top-8 h-[calc(100%-6rem)] w-6"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 24 600"
      >
        <path
          d="M12 0c10 60 -10 90 0 150s10 90 0 150 -10 90 0 150 10 90 0 150"
          stroke={`${accent}4d`}
          strokeWidth="1.5"
        />
      </svg>

      {items.map((item) => (
        <li key={`${item.time}-${item.title}`} className="relative flex gap-6 py-7">
          {/* The bloom. Five petals and a centre, drawn small enough that it
              reads as a mark on the vine rather than as an illustration
              competing with the painted scene above. */}
          <svg
            aria-hidden
            className="relative z-10 mt-1 h-7 w-7 shrink-0"
            fill="none"
            viewBox="0 0 28 28"
          >
            <circle cx="14" cy="14" r="13" fill="var(--jardin-paper)" />
            {[0, 72, 144, 216, 288].map((angle) => (
              <ellipse
                key={angle}
                cx="14"
                cy="9"
                fill={`${accent}2e`}
                rx="3.4"
                ry="5"
                stroke={`${accent}80`}
                strokeWidth="0.9"
                transform={`rotate(${angle} 14 14)`}
              />
            ))}
            <circle cx="14" cy="14" fill={accent} r="1.8" />
          </svg>

          <div className="min-w-0 flex-1">
            <p
              className="text-[11px] uppercase tracking-[0.2em]"
              style={{ color: accent }}
            >
              {item.time}
            </p>
            <h3
              className="mt-1.5 text-[1.6rem] leading-tight"
              style={{ color: ink, fontFamily: 'var(--font-jardin-script)' }}
            >
              {item.title}
            </h3>
            {item.description ? (
              <p
                className="mt-1.5 text-[14.5px] leading-relaxed"
                style={{ color: `${ink}bf` }}
              >
                {item.description}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
