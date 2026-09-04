import Image from 'next/image';
import { Countdown } from '@/components/invitation/primitives/Countdown';
import {
  ART_ROLES,
  SHEET_CHANNEL_INSET,
  SHEET_MAX_WIDTH,
  SHEET_SLOTS,
  type Band,
  type BandArt,
  type SheetSlot,
  type SheetSpec,
} from '@/lib/sheet';
import type { Entitlements, InvitationContent } from '@/lib/schemas/invitation';

/**
 * Renders one decorated sheet: a stack of bands, with the couple's details set
 * into the slots the artist left for them.
 *
 * This is the seam that makes drawn templates cheap. A new design is a set of
 * illustrations drawn to lib/sheet.ts plus one registry entry — no new layout
 * code, because the band vocabulary is fixed and only the artwork changes.
 *
 * Bands stack in document order and each takes the height its own content
 * needs, so a schedule with nine events pushes the bands below it down instead
 * of overflowing a box that was sized for three.
 */

type SheetProps = {
  spec: SheetSpec;
  content: InvitationContent;
  entitlements: Entitlements;
};

export function Sheet({ spec, content, entitlements }: SheetProps) {
  return (
    <main style={{ background: spec.ground }}>
      {/* The sheet is the containment context every band measures against, so
          band heights follow the sheet's width and not the browser window.
          That is what lets the storefront scale a whole template into a
          thumbnail without the layout changing shape. */}
      <div
        className="relative mx-auto w-full"
        style={{ containerType: 'inline-size', maxWidth: SHEET_MAX_WIDTH }}
      >
        {spec.bands.map((band, index) => (
          <BandView
            band={band}
            content={content}
            entitlements={entitlements}
            // Bands are a fixed authored list, never reordered at runtime.
            key={index}
            spec={spec}
          />
        ))}
      </div>
    </main>
  );
}

type BandViewProps = {
  band: Band;
  spec: SheetSpec;
  content: InvitationContent;
  entitlements: Entitlements;
};

function BandView({ band, spec, content, entitlements }: BandViewProps) {
  if (band.kind === 'divider') {
    return (
      <div className="relative w-full" style={{ aspectRatio: band.aspect }}>
        <Image
          alt=""
          className="pointer-events-none select-none object-cover"
          fill
          sizes={`(max-width: ${SHEET_MAX_WIDTH}px) 100vw, ${SHEET_MAX_WIDTH}px`}
          src={band.art.src}
        />
      </div>
    );
  }

  const rendered = band.slots
    .map((slot) => renderSlot(slot, spec, content, entitlements))
    .filter((node) => node !== null);

  /* A band whose every slot resolved to nothing — no message, no gallery
     entitlement — would otherwise hold open an empty minHeight and leave a gap
     the artwork was never drawn around. */
  if (rendered.length === 0) return null;

  /* overflow-hidden keeps an intrusion inside the band it decorates. Without
     it a corner spray spills onto the neighbouring band and lands on text that
     no artist ever positioned it against. */
  return (
    <section
      className="relative flex w-full flex-col items-center justify-center overflow-hidden"
      style={{ minHeight: `${band.minHeight}cqw` }}
    >
      {band.art ? <BandArtwork art={band.art} /> : null}

      {/* z-10: words always sit above ornament, never under it. */}
      <div
        className="relative z-10 flex w-full flex-col items-center gap-6 py-14"
        style={{
          paddingLeft: `${SHEET_CHANNEL_INSET}%`,
          paddingRight: `${SHEET_CHANNEL_INSET}%`,
        }}
      >
        {rendered}
      </div>
    </section>
  );
}

/** Intrusions sit under the text channel and never intercept a tap. */
function BandArtwork({ art }: { art: BandArt }) {
  if (art.role === ART_ROLES.COLUMNS) {
    return (
      <Image
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
        height={art.height}
        src={art.src}
        width={art.width}
      />
    );
  }

  const corner = art.corner ?? 'top-left';
  const [vertical, horizontal] = corner.split('-');

  /* An intrusion is held to the channel's outer margin and pulled off the
     band's edge, so it reads as artwork entering from outside the page rather
     than a shape parked on top of the words. Width is the inset itself: that
     is precisely the room the text channel does not use. */
  return (
    <Image
      alt=""
      className="pointer-events-none absolute select-none opacity-70"
      height={art.height}
      src={art.src}
      style={{
        width: `${SHEET_CHANNEL_INSET * 1.6}%`,
        [vertical === 'top' ? 'top' : 'bottom']: '-4%',
        [horizontal === 'left' ? 'left' : 'right']: '-2%',
      }}
      width={art.width}
    />
  );
}

function renderSlot(
  slot: SheetSlot,
  spec: SheetSpec,
  content: InvitationContent,
  entitlements: Entitlements,
): React.ReactNode {
  switch (slot) {
    case SHEET_SLOTS.EYEBROW:
      return content.headline ? (
        <p
          className="reve-crisp text-center text-[11px] uppercase tracking-[0.24em]"
          key={slot}
          style={{ color: spec.muted }}
        >
          {content.headline}
        </p>
      ) : null;

    case SHEET_SLOTS.NAMES:
      return (
        <h1
          className="text-balance text-center text-[clamp(1.75rem,7vw,3rem)] leading-tight"
          key={slot}
          style={{ color: spec.ink }}
        >
          {content.coupleFirstName}
          <span
            className="mx-3"
            style={{
              color: spec.accent,
              fontFamily: 'var(--font-accent)',
              fontStyle: 'italic',
            }}
          >
            &amp;
          </span>
          {content.couplePartnerName}
        </h1>
      );

    case SHEET_SLOTS.DATE:
      return (
        <p
          className="reve-crisp text-center text-[13px] tracking-[0.18em]"
          key={slot}
          style={{ color: spec.muted }}
        >
          {formatSheetDate(content.eventDate)}
        </p>
      );

    case SHEET_SLOTS.MESSAGE:
      return content.message ? (
        <p
          className="max-w-prose text-center text-[14px] leading-relaxed"
          key={slot}
          style={{ color: spec.ink }}
        >
          {content.message}
        </p>
      ) : null;

    case SHEET_SLOTS.COUNTDOWN:
      return (
        <div key={slot} style={{ color: spec.ink }}>
          <Countdown bare eventDate={content.eventDate} />
        </div>
      );

    case SHEET_SLOTS.VENUE:
      return (
        <div className="text-center" key={slot} style={{ color: spec.ink }}>
          <p className="text-[19px]">{content.venue.name}</p>
          <p
            className="reve-crisp mt-1.5 text-[13px]"
            style={{ color: spec.muted }}
          >
            {content.venue.addressLine}
          </p>
          {content.venue.mapUrl ? (
            <a
              className="reve-crisp mt-3 inline-block border-b pb-0.5 text-[11px] uppercase tracking-[0.14em]"
              href={content.venue.mapUrl}
              rel="noreferrer noopener"
              style={{ color: spec.accent, borderColor: spec.accent }}
              target="_blank"
            >
              Open in maps
            </a>
          ) : null}
        </div>
      );

    case SHEET_SLOTS.SCHEDULE:
      return content.schedule.length > 0 ? (
        <ul
          className="flex flex-col gap-4"
          key={slot}
          style={{ color: spec.ink }}
        >
          {content.schedule.map((item) => (
            <li
              className="flex items-baseline gap-4"
              key={`${item.time}-${item.title}`}
            >
              <span
                className="reve-crisp w-14 shrink-0 text-[12px]"
                style={{
                  color: spec.accent,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {item.time}
              </span>
              <span className="min-w-0">
                <span className="block text-[15px]">{item.title}</span>
                {item.description ? (
                  <span
                    className="block text-[12px]"
                    style={{ color: spec.muted }}
                  >
                    {item.description}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null;

    case SHEET_SLOTS.GALLERY:
      return entitlements.gallery && content.gallery.length > 0 ? (
        <div className="grid w-full grid-cols-3 gap-2" key={slot}>
          {content.gallery.slice(0, 3).map((photo) => (
            <Image
              alt={photo.alt}
              className="h-full w-full object-cover"
              height={600}
              key={photo.src}
              src={photo.src}
              width={600}
            />
          ))}
        </div>
      ) : null;

    case SHEET_SLOTS.RSVP:
      return entitlements.rsvp ? (
        <span
          className="reve-crisp rounded-full px-7 py-2.5 text-[11px] uppercase tracking-[0.16em]"
          key={slot}
          style={{ background: spec.accent, color: spec.ground }}
        >
          RSVP
        </span>
      ) : null;
  }
}

/** Sheets set the date the way stationery does, never as a numeric receipt. */
function formatSheetDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
