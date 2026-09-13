import Image from 'next/image';
import { Petals } from '@/components/invitation/motifs/Petals';
import { CountdownDial } from './CountdownDial';
import { EveningTimeline } from './EveningTimeline';
import { linBody, linScript } from './fonts';
import type {
  Entitlements,
  InvitationContent,
  Theme,
} from '@/lib/schemas/invitation';

type LinProps = {
  content: InvitationContent;
  theme: Theme;
  entitlements: Entitlements;
};

const SAGE = '#c7c7ba';
const SAGE_DEEP = '#b7b8a8';
const CREAM = '#f5f0e6';
const INK = '#3a2f22';
const GOLD = '#8a6d3a';

/**
 * Lin — the digital counterpart to the linen-and-wax envelope, built off the
 * client's botanical reference: sage and cream bands alternate down the
 * page, a script face carries every heading, and each section corner drifts
 * with the same loose floral spray as the reference's Canva mock.
 *
 * Owns its layout outright. There are no shared section, hero or gallery
 * components left to compose: a design is bought on how it looks, and every
 * wrapper held in common pulls the next design toward this one's silhouette.
 * What Lin shares is the falling-petal motif, which paints over a design
 * without shaping it, and the countdown's arithmetic, which is a clock rather
 * than a look.
 *
 * Props are declared locally rather than imported from the registry: the
 * registry imports this component, so importing its types back would close a
 * cycle.
 */
export function Lin({ content, theme, entitlements }: LinProps) {
  return (
    <main
      className={`${linScript.variable} ${linBody.variable} relative min-h-dvh text-[17px]`}
      style={{
        backgroundColor: CREAM,
        color: INK,
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

      <Band bg={CREAM}>
        <SectionHeading subtitle="Until we say I do" title="The Countdown" />
        <CountdownDial eventDate={content.eventDate} />
      </Band>

      <Band bg={SAGE}>
        <SectionHeading subtitle="Where we'll celebrate" title="The Venue" />
        {/* Name and address are deliberately not printed: the drawing carries
            the section, and the button takes a guest to the place itself.
            Both still travel in `content.venue` for the other templates and
            for the directions link below. */}
        <Section className="text-center">
          <VenueIllustration />

          {content.venue.mapUrl ? (
            <a
              className="mt-6 inline-block rounded-full border px-6 py-2 text-[12px] uppercase tracking-[0.18em]"
              href={content.venue.mapUrl}
              rel="noreferrer noopener"
              style={{ borderColor: GOLD, color: GOLD }}
              target="_blank"
            >
              Directions
            </a>
          ) : null}
        </Section>
      </Band>

      {content.schedule.length > 0 ? (
        <Band bg={CREAM}>
          <SectionHeading
            subtitle="Everything you need to know about tonight"
            title="The Evening"
          />
          <Section>
            <EveningTimeline items={content.schedule} />
          </Section>
        </Band>
      ) : null}

      <Band bg={SAGE_DEEP}>
        <RsvpSection />

        {content.registryMessage ? (
          <Section className="pt-0 text-center">
            <ScriptHeading>Wedding Registry</ScriptHeading>
            <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed">
              {content.registryMessage}
            </p>
          </Section>
        ) : null}
      </Band>

      <LinGallery content={content} entitlements={entitlements} />
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

/**
 * Gated sections render nothing at all when the capability is absent — no
 * placeholder, no upsell, no empty container.
 */
function LinGallery({
  content,
  entitlements,
}: {
  content: InvitationContent;
  entitlements: Entitlements;
}) {
  if (!entitlements.gallery) return null;
  if (content.gallery.length === 0) return null;

  return (
    <Section>
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

/* Bands paint their own ground and sit below the petal layer, so petals drift
   over every section rather than only over the hero. Their content is lifted
   above the petals again so nothing ever falls across the text. */
function Band({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div className="relative" style={{ backgroundColor: bg }}>
      <div className="relative z-20">{children}</div>
    </div>
  );
}

function HeroSection({ content }: { content: InvitationContent }) {
  const media = content.heroMedia;

  return (
    /* Light text over the darkened video, dark ink over the pale fallback
       ground: the hero is the one section whose text colour depends on what
       is behind it. */
    <section
      className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6 py-20 text-center"
      style={{ color: media ? CREAM : INK }}
    >
      {media ? (
        <div className="absolute inset-0">
          {media.type === 'video' ? (
            <video
              autoPlay
              className="h-full w-full object-cover"
              loop
              muted
              playsInline
              src={media.src}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- full-bleed hero background, not a content image
            <img alt="" className="h-full w-full object-cover" src={media.src} />
          )}
          {/* A dark veil: the video is atmosphere behind the names, not the
              subject, and the script over it has to stay legible. */}
          <div className="absolute inset-0" style={{ backgroundColor: '#2b2013a6' }} />
        </div>
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: SAGE }} />
      )}

      <div className="relative z-20">
        {/* Inherits the hero's colour rather than taking the sections' gold:
            gold on the darkened video is too dim to read. */}
        {content.headline ? (
          <p
            className="text-2xl md:text-3xl"
            style={{ fontFamily: 'var(--font-lin-script)' }}
          >
            {content.headline}
          </p>
        ) : null}

        <p
          className="mt-8 text-[76px] leading-[0.9] md:text-[96px]"
          style={{ fontFamily: 'var(--font-lin-script)' }}
        >
          {content.coupleFirstName}
        </p>
        <p className="my-2 text-2xl italic">&amp;</p>
        <p
          className="text-[76px] leading-[0.9] md:text-[96px]"
          style={{ fontFamily: 'var(--font-lin-script)' }}
        >
          {content.couplePartnerName}
        </p>

        {content.message ? (
          <p className="mx-auto mt-10 max-w-md text-[15px] leading-relaxed">
            {content.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ScriptHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-4xl"
      style={{ fontFamily: 'var(--font-lin-script)', color: GOLD }}
    >
      {children}
    </h2>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-6 pt-20 text-center md:pt-28">
      <ScriptHeading>{title}</ScriptHeading>
      {subtitle ? (
        <p className="mt-2 text-[13px]" style={{ color: `${INK}b3` }}>
          {subtitle}
        </p>
      ) : null}
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

/**
 * Static for now: no Server Action or storage wired up, so submitting does
 * nothing. The fields match what the client asked for so the shape is right
 * once RSVP persistence gets its own design pass.
 */
function RsvpSection() {
  return (
    <Section>
      <div className="text-center">
        <ScriptHeading>Reservation</ScriptHeading>
        <p className="mt-2 text-[13px]" style={{ color: `${INK}b3` }}>
          We&rsquo;d love to know if you&rsquo;ll be joining us
        </p>
      </div>

      <form className="mx-auto mt-10 flex max-w-sm flex-col gap-5">
        <label
          className="flex flex-col gap-2 text-left text-[13px] uppercase tracking-[0.14em]"
          style={{ color: `${INK}b3` }}
        >
          Your name
          <input
            className="rounded-md border bg-white/60 px-4 py-2 text-base normal-case tracking-normal"
            name="name"
            style={{ borderColor: `${INK}33`, color: INK }}
            type="text"
          />
        </label>

        <fieldset
          className="text-left text-[13px] uppercase tracking-[0.14em]"
          style={{ color: `${INK}b3` }}
        >
          <legend>Will you be joining us?</legend>
          <div className="mt-3 flex gap-6 normal-case tracking-normal">
            <label className="flex items-center gap-2">
              <input name="attending" type="radio" value="yes" />
              Yes
            </label>
            <label className="flex items-center gap-2">
              <input name="attending" type="radio" value="no" />
              No
            </label>
          </div>
        </fieldset>

        <button
          className="mt-2 rounded-full px-6 py-3 text-[12px] uppercase tracking-[0.18em]"
          style={{ backgroundColor: GOLD, color: CREAM }}
          type="submit"
        >
          Submit
        </button>
      </form>
    </Section>
  );
}
