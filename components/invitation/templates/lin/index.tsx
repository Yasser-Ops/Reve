import Image from 'next/image';
import { HeroVideo } from '@/components/invitation/HeroVideo';
import { Petals } from '@/components/invitation/motifs/Petals';
import { SCREEN_HEIGHT, screenShare } from '@/components/invitation/screen';
import { CountdownDial } from './CountdownDial';
import { EveningTimeline } from './EveningTimeline';
import { linBody, linNames, linScript } from './fonts';
import { LIN } from './palette';
import { PetalSpray, type SpraySide } from './PetalSpray';
import { RsvpReveal } from './RsvpReveal';
import { TornEdge } from './TornEdge';
import type { Entitlements, Theme } from '@/lib/schemas/invitation';
import type { LinContent } from './schema';

type LinProps = {
  content: LinContent;
  theme: Theme;
  entitlements: Entitlements;
  rsvpSlug?: string | null;
};

/**
 * Lin, as the client approved it in Canva (2026-11): the couple's film washed
 * pale behind their names in a signature script, then paper-white and mist
 * bands joined by torn-paper edges, petals resting along the seams and more
 * falling the length of the page.
 *
 * Owns its layout outright. There are no shared section, hero or gallery
 * components: a design is bought on how it looks, and every wrapper held in
 * common pulls the next design toward this one's silhouette. What Lin shares
 * is the falling-petal motif, which paints over a design without shaping it,
 * and the countdown's arithmetic, which is a clock rather than a look.
 *
 * Props are declared locally rather than imported from the registry: the
 * registry imports this component, so importing its types back would close a
 * cycle.
 */
export function Lin({ content, theme, entitlements, rsvpSlug = null }: LinProps) {
  /* Bands are listed, then coloured by position: an absent section must not
     leave two bands of one colour meeting at a tear. */
  const bands: Array<{ key: string; body: React.ReactNode }> = [
    {
      key: 'countdown',
      body: (
        <>
          <SectionHeading subtitle="Until we say I Do" title="The Countdown" />
          <CountdownDial eventDate={content.eventDate} />
        </>
      ),
    },
    {
      key: 'venue',
      body: (
        <>
          <SectionHeading subtitle="Where we'll celebrate" title="The Venue" />
          {/* Name and address are deliberately not printed: the drawing carries
              the section, and the button takes a guest to the place itself.
              Both still travel in `content.venue` for the directions link. */}
          <Section className="pt-6 text-center">
            <VenueIllustration />
            {content.venue.mapUrl ? (
              <a
                className="mt-2 inline-block rounded-full border px-8 py-2 text-[13px] uppercase tracking-[0.16em]"
                href={content.venue.mapUrl}
                rel="noreferrer noopener"
                style={{ borderColor: LIN.GOLD, color: LIN.GOLD }}
                target="_blank"
              >
                Directions
              </a>
            ) : null}
          </Section>
        </>
      ),
    },
  ];

  if (content.schedule.length > 0) {
    bands.push({
      key: 'evening',
      body: (
        <>
          <SectionHeading subtitle="Everything you need to know about tonight" title="The Evening" />
          <Section className="pt-10">
            <EveningTimeline items={content.schedule} />
          </Section>
        </>
      ),
    });
  }

  if (entitlements.rsvp) {
    bands.push({
      key: 'reservation',
      body: (
        <Section className="text-center">
          <ScriptHeading>Reservation</ScriptHeading>
          <Subtitle>We&rsquo;d love to know if you&rsquo;ll be joining us</Subtitle>
          <RsvpReveal rsvpSlug={rsvpSlug} />
        </Section>
      ),
    });
  }

  const showGallery = entitlements.gallery && content.gallery.length > 0;
  if (content.registryMessage || showGallery) {
    bands.push({
      key: 'registry',
      body: (
        <>
          {content.registryMessage ? (
            <Section className="text-center">
              <ScriptHeading>Wedding Registry</ScriptHeading>
              {/* Line breaks kept: bank details are written into this note. */}
              <p className="mx-auto mt-5 max-w-md text-[16px] leading-relaxed whitespace-pre-line">
                {content.registryMessage}
              </p>
            </Section>
          ) : null}
          {showGallery ? <LinGallery content={content} /> : null}
        </>
      ),
    });
  }

  return (
    <main
      /* overflow-x clip, not hidden: the sprays lean past the page edge, and
         hidden would turn main into a scroll box that traps the sticky bits. */
      className={`${linScript.variable} ${linNames.variable} ${linBody.variable} relative overflow-x-clip text-[17px]`}
      style={{
        minHeight: SCREEN_HEIGHT,
        backgroundColor: LIN.PAPER,
        color: LIN.INK,
        fontFamily: 'var(--font-lin-body)',
        /* Cormorant is a fine old-style face: on Windows it renders jagged at
           small sizes without these, and its low x-height needs a larger base
           than a sans would. */
        WebkitFontSmoothing: 'antialiased',
        textRendering: 'optimizeLegibility',
      }}
    >
      <Petals motion={theme.motion} />

      <HeroSection content={content} />

      {bands.map((band, index) => (
        <Band
          bg={index % 2 === 0 ? LIN.PAPER : LIN.MIST}
          key={band.key}
          seed={index + 1}
          spray={index % 2 === 0 ? 'right' : 'left'}
        >
          {band.body}
        </Band>
      ))}
    </main>
  );
}

/**
 * Lin's vertical rhythm. Local rather than shared: the spacing is part of the
 * art direction, and a wrapper every design imports is a wrapper every design
 * ends up arguing with.
 */
function Section({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`px-6 py-20 md:py-28 ${className ?? ''}`}>
      <div className="mx-auto w-full max-w-2xl">{children}</div>
    </section>
  );
}

function LinGallery({ content }: { content: LinContent }) {
  return (
    <Section className="pt-0">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {content.gallery.map((photo) => (
          <Image
            key={photo.src}
            alt={photo.alt}
            className="h-full w-full object-cover"
            height={800}
            src={photo.src}
            width={800}
          />
        ))}
      </div>
    </Section>
  );
}

/*
 * A band paints its own ground, tears its own top edge over the band above,
 * and rests a petal spray across that seam. Grounds sit below the falling
 * petals; content is lifted above them again so nothing falls across text.
 */
function Band({
  bg,
  seed,
  spray,
  children,
}: {
  bg: string;
  seed: number;
  spray: SpraySide;
  children: React.ReactNode;
}) {
  return (
    <div className="relative" style={{ backgroundColor: bg }}>
      <TornEdge color={bg} seed={seed} />
      <PetalSpray side={spray} />
      <div className="relative z-20">{children}</div>
    </div>
  );
}

function HeroSection({ content }: { content: LinContent }) {
  const media = content.heroMedia;

  return (
    /* Dark script over a pale wash, as in the mock: the film is atmosphere
       behind the names, so it is lightened rather than darkened. */
    <section
      className="relative flex flex-col items-center overflow-hidden px-6 pb-20 text-center"
      style={{
        minHeight: SCREEN_HEIGHT,
        paddingTop: screenShare(0.12),
        color: LIN.HERO_INK,
      }}
    >
      {media ? (
        <div className="absolute inset-0">
          {media.type === 'video' ? (
            <HeroVideo className="h-full w-full object-cover" src={media.src} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- full-bleed hero background, not a content image
            <img alt="" className="h-full w-full object-cover" src={media.src} />
          )}
          <div className="absolute inset-0" style={{ backgroundColor: LIN.HERO_WASH }} />
        </div>
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: LIN.MIST }} />
      )}

      <div className="relative z-20">
        {content.headline ? (
          <p className="text-[26px] md:text-[32px]" style={{ fontFamily: 'var(--font-lin-script)' }}>
            {content.headline}
          </p>
        ) : null}

        <h1
          className="mt-2 leading-[1.05] text-balance"
          style={{ fontFamily: 'var(--font-lin-names)', fontSize: 'clamp(56px, 16vw, 108px)' }}
        >
          {content.coupleFirstName}
          {/* The script's ampersand sweeps into both names without room. */}
          <span style={{ marginInline: '0.4em' }}>&amp;</span>
          {content.couplePartnerName}
        </h1>
      </div>
    </section>
  );
}

function ScriptHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-[44px] leading-tight md:text-[52px]"
      style={{ fontFamily: 'var(--font-lin-script)', color: LIN.GOLD }}
    >
      {children}
    </h2>
  );
}

function Subtitle({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[17px]">{children}</p>;
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-6 pt-20 text-center md:pt-28">
      <ScriptHeading>{title}</ScriptHeading>
      {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
    </div>
  );
}

/** Wider than the timeline icons: this one carries its own section. */
function VenueIllustration() {
  return (
    <Image
      alt=""
      aria-hidden
      className="mx-auto mb-6 h-auto w-full max-w-md"
      height={492}
      src="/invitation/lin/venue.webp"
      width={900}
    />
  );
}
