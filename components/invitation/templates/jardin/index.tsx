import Image from 'next/image';
import { SCREEN_HEIGHT, screenShare } from '@/components/invitation/screen';
import { FountainCount } from './FountainCount';
import { GardenParallax } from './GardenParallax';
import { GardenPath } from './GardenPath';
import { RsvpForm } from './RsvpForm';
import { jardinBody, jardinScript } from './fonts';
import type { Entitlements, Theme } from '@/lib/schemas/invitation';
import type { JardinContent } from './schema';

type JardinProps = {
  content: JardinContent;
  theme: Theme;
  entitlements: Entitlements;
  rsvpSlug?: string | null;
};

/*
 * THE ENVELOPE OPENS INTO LIGHT.
 *
 * The envelope's paper measures #c9bbb5 — a greyed, desaturated mauve. The
 * first palette here was pulled straight off that render on the reasoning
 * that the two should read as one material, which put the invitation at
 * #f4e7e3: close enough to feel like the same paper, far enough to look like
 * a mismatch rather than a choice. The mouth had nothing to open onto.
 *
 * So the grounds below are deliberately LIGHTER and WARMER than the envelope
 * rather than sampled from it. The envelope reads as dusk, the invitation as
 * the lit garden inside it, and the moment the flap clears is a step into
 * light. Measured at 1.72:1 between PAPER and the envelope's paper — not a
 * text ratio, a perceptible change of ground.
 *
 * PAPER_DEEP is the one value under real tension: it has to separate from
 * PAPER to make the sections read as different rooms, while staying clear of
 * the envelope's mauve it would otherwise drift back into. #e8d3c8 is the
 * balance point at 1.33:1 against PAPER and 1.30:1 against the envelope.
 */
const PAPER = '#fbf5f0';
const PAPER_DEEP = '#e8d3c8';
const ROSE = '#8a2f43';
const INK = '#3a2a2d';
const MOSS = '#55613f';

/**
 * Jardin — the fantasy design: a painted garden you walk into rather than a
 * page you scroll down.
 *
 * Where Lin alternates flat sage and cream bands, Jardin has one continuous
 * painted world. The hero's three planes separate as you scroll (see
 * `GardenParallax`), and each section below sits on paper lighter than the
 * envelope that carried it, so the scene recedes and the invitation itself
 * comes forward.
 *
 * Owns its layout outright, for the reason Lin's note gives: a design is
 * bought on how it looks, and every wrapper held in common pulls the next
 * design toward the last one's silhouette. It shares only the countdown's
 * arithmetic, which is a clock rather than a look. It deliberately does not
 * use the `motifs/Petals` overlay — falling petals are Lin's signature, and
 * the parallax is Jardin's.
 *
 * Props are declared locally rather than imported from the registry: the
 * registry imports this component, so importing its types back would close a
 * cycle.
 */
export function Jardin({ content, theme, entitlements, rsvpSlug = null }: JardinProps) {
  return (
    <main
      className={`${jardinScript.variable} ${jardinBody.variable} relative text-[17px]`}
      style={{
        minHeight: SCREEN_HEIGHT,
        backgroundColor: PAPER,
        color: INK,
        fontFamily: 'var(--font-jardin-body)',
        /* Consumed by GardenPath's blooms, which punch a hole in the vine
           behind them and so need the exact ground they sit on. */
        ['--jardin-paper' as string]: PAPER,
        WebkitFontSmoothing: 'antialiased',
        textRendering: 'optimizeLegibility',
      }}
    >
      <HeroSection content={content} motion={theme.motion} />

      <Section>
        <SectionHeading subtitle="Until the gates open" title="The Countdown" />
        <FountainCount eventDate={content.eventDate} ink={INK} />
      </Section>

      <Section ground={PAPER_DEEP}>
        <SectionHeading subtitle="Where we will be" title="The Grounds" />
        <div className="mx-auto max-w-xl px-6 text-center">
          {/* Painted in the hero's hand, and FLOATED rather than framed: the
              plate carries its own deckled brushstroke edge on transparency,
              so it rests on whatever ground the section sets rather than
              bringing a rectangle of paper with it. An earlier cut of this
              painting ran its edge off three sides and had a flat margin
              added at conversion; a torn edge the painter actually made is
              the thing that margin was standing in for.

              WIDER THAN IT WAS. At `max-w-md` the plate rendered 448px inside
              a 582px section — the section's whole subject, shown small, and
              28% of the section left as air. `max-w-xl` lets the painting
              carry the space it is there to fill. */}
          <Image
            alt=""
            aria-hidden
            className="mx-auto h-auto w-full max-w-xl"
            height={893}
            src="/invitation/jardin/venue.webp"
            width={1600}
          />

          <p
            className="mt-7 text-[1.9rem] leading-tight"
            style={{ fontFamily: 'var(--font-jardin-script)' }}
          >
            {content.venue.name}
          </p>
          <p className="mt-2 text-[14.5px]" style={{ color: `${INK}bf` }}>
            {content.venue.addressLine}
          </p>

          {content.venue.mapUrl ? (
            <a
              className="mt-7 inline-block rounded-full border px-7 py-2.5 text-[11px] uppercase tracking-[0.2em] transition-colors"
              href={content.venue.mapUrl}
              rel="noreferrer noopener"
              style={{ borderColor: `${ROSE}66`, color: ROSE }}
              target="_blank"
            >
              Find the gate
            </a>
          ) : null}
        </div>
      </Section>

      {content.schedule.length > 0 ? (
        <Section>
          <SectionHeading subtitle="How the evening runs" title="The Evening" />
          <div className="px-6">
            <GardenPath accent={MOSS} ink={INK} items={content.schedule} />
          </div>
        </Section>
      ) : null}

      <Section ground={PAPER_DEEP}>
        {entitlements.rsvp ? <RsvpSection rsvpSlug={rsvpSlug} /> : null}
      </Section>

      {content.registryMessage ? (
        /* One sentence. At full padding this was half air — the emptiest
           moment on the page, and the last one before the dusk plate. */
        <Section density={DENSITY.CLOSE}>
          <div className="mx-auto max-w-xl px-6 text-center">
            <ScriptHeading>With thanks</ScriptHeading>
            <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-relaxed">
              {content.registryMessage}
            </p>
          </div>
        </Section>
      ) : null}

      <JardinGallery content={content} entitlements={entitlements} />

      {/* The closing plate: the garden at dusk, the same world the hero opens
          in, so the page ends where it began rather than stopping. */}
      <div className="relative overflow-hidden" style={{ height: screenShare(0.52) }}>
        {/* THE PLATE IS COMPOSED AROUND THIS BOX, not merely placed in it.
            Two constraints it has to satisfy, both invisible in the file:

            The INITIALS below are set in PAPER, near-white, so the bottom
            sixth is an empty terrace in shadow — measured at 5.96:1 mean
            contrast, 2.75:1 at its lightest pixel. A re-render that puts
            balustrade or lantern light back into that band takes the text
            with it.

            `object-cover` CROPS TOWARD A PHONE. This box is 3.6:1 on a
            laptop and 0.87:1 on a phone, so the arch, villa and path all sit
            within the central third and the cypresses at the edges are the
            part meant to be lost. A plate composed wide — the first one was
            2.19:1 — keeps only its middle on the stage that matters most. */}
        <Image
          alt=""
          aria-hidden
          className="h-full w-full object-cover"
          height={900}
          src="/invitation/jardin/dusk.webp"
          width={1600}
        />
        <div
          className="absolute inset-x-0 top-0 h-24"
          style={{ background: `linear-gradient(${PAPER}, transparent)` }}
        />
        <p
          className="absolute inset-x-0 bottom-10 text-center text-[2.4rem]"
          style={{ color: PAPER, fontFamily: 'var(--font-jardin-script)' }}
        >
          {content.initials}
        </p>
      </div>
    </main>
  );
}

/**
 * Jardin's vertical rhythm, and the one place a section's ground is set.
 *
 * Local rather than shared, for the reason the template's own note gives.
 * Grounds alternate between the lit paper and a warmer blush cut of it — a
 * change of light on the same material, where Lin changes colour outright
 * between sage and cream.
 */
/**
 * How much air a section pays for, which is not a constant.
 *
 * MEASURED, not guessed. Every section carried the same `py-20 md:py-28`
 * whether it held a five-item timeline or one sentence, and the emptiness
 * showed up as the share of a section's height occupied by nothing: the
 * evening 19%, the grounds 28%, the countdown 34%, the closing thanks 50% —
 * a single line of text in a 322px box, and the last thing read before the
 * dusk plate.
 *
 * `full` is the original rhythm and still right for a section with a list or
 * a plate in it. `close` is for a section whose content is one block; it
 * keeps the page's cadence without leaving a short section stranded in air.
 */
const DENSITY = {
  FULL: 'full',
  CLOSE: 'close',
} as const;

type Density = (typeof DENSITY)[keyof typeof DENSITY];

function Section({
  children,
  ground,
  density = DENSITY.FULL,
}: {
  children: React.ReactNode;
  ground?: string;
  density?: Density;
}) {
  return (
    <section
      className={
        density === DENSITY.CLOSE ? 'py-12 md:py-16' : 'py-20 md:py-28'
      }
      style={ground ? { backgroundColor: ground } : undefined}
    >
      {children}
    </section>
  );
}

function ScriptHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-[2.6rem] leading-tight"
      style={{ color: ROSE, fontFamily: 'var(--font-jardin-script)' }}
    >
      {children}
    </h2>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="px-6 pb-12 text-center">
      <ScriptHeading>{title}</ScriptHeading>
      {subtitle ? (
        <p
          className="mt-2 text-[11px] uppercase tracking-[0.2em]"
          style={{ color: `${INK}99` }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The hero: the painted scene, with the names set into it.
 *
 * `content.heroMedia` is deliberately ignored here, unlike in Lin. Lin is
 * built around a couple's own film — the video is the subject and the design
 * frames it. Jardin is the opposite: the painted garden IS the design, and
 * swapping a phone video in behind the names would leave the parallax with
 * nothing to move and turn this into Lin with a different script face. A
 * couple's photographs still have a home on the page, in the gallery below.
 */
function HeroSection({
  content,
  motion,
}: {
  content: JardinContent;
  motion: Theme['motion'];
}) {
  return (
    <section
      className="relative flex items-center justify-center overflow-hidden px-6 py-24 text-center"
      style={{ minHeight: SCREEN_HEIGHT }}
    >
      <GardenParallax motion={motion} />

      {/* NOTHING IS LAID OVER THE PAINTING.
          Two darkening layers were tried here and both went: a full-plate
          gradient, which at 35-55% opacity turned the blossom grey and took
          the light out of the sky, and then a pool behind the names, which
          spared the edges but still put a smudge across the middle of the
          picture.

          THE TYPE CARRIES ITSELF INSTEAD. Set dark rather than pale, it needs
          no ground at all: the plate keeps its pale sky and stone path down
          the whole centre band, so ink on it reads well clear of the 4.5:1
          floor where paper-coloured script needed half the painting dimmed to
          reach the same number. The artwork is at full strength everywhere.

          THIS CONSTRAINS THE ARTWORK, NOT THE OTHER WAY ROUND. A plate whose
          centre goes dark has no scrim to fall back on, so a replacement is
          measured against INK across the three text bands before it ships. */}

      {/* INK, the same dark the page below is set in, not a second near-black
          invented for the hero. Measured on the shipped plate: 9.3:1 at the
          headline, 10.4:1 across the names, 10.2:1 at the message, with under
          3.5% of any band below 4.5:1 — the blossom and urns at the margins,
          which the type does not cross. */}
      <div className="relative z-20" style={{ color: INK }}>
        {content.headline ? (
          <p className="text-[11px] uppercase tracking-[0.28em]">
            {content.headline}
          </p>
        ) : null}

        <p
          className="mt-9 text-[64px] leading-[1.05] md:text-[88px]"
          style={{ fontFamily: 'var(--font-jardin-script)' }}
        >
          {content.coupleFirstName}
        </p>
        {/* Set in the body face's italic, small, between the two names: Pinyon
            Script's ampersand is an elaborate glyph and at this size it would
            compete with the names it is meant to join. */}
        <p className="my-1 text-xl italic">and</p>
        <p
          className="text-[64px] leading-[1.05] md:text-[88px]"
          style={{ fontFamily: 'var(--font-jardin-script)' }}
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

/**
 * Gated sections render nothing at all when the capability is absent — no
 * placeholder, no upsell, no empty container.
 */
function JardinGallery({
  content,
  entitlements,
}: {
  content: JardinContent;
  entitlements: Entitlements;
}) {
  if (!entitlements.gallery) return null;
  if (content.gallery.length === 0) return null;

  return (
    <Section>
      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 px-6 md:grid-cols-3">
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

/**
 * The reply card. It sends only on the live invitation (`rsvpSlug` set); on
 * a preview it explains that instead. Switched off by the `rsvp` entitlement.
 */
function RsvpSection({ rsvpSlug }: { rsvpSlug: string | null }) {
  return (
    <div className="mx-auto max-w-xl px-6">
      <div className="text-center">
        <ScriptHeading>Will you come?</ScriptHeading>
        <p
          className="mt-2 text-[11px] uppercase tracking-[0.2em]"
          style={{ color: `${INK}99` }}
        >
          Let us know before the gates close
        </p>
      </div>

      <RsvpForm accent={ROSE} ink={INK} paper={PAPER} rsvpSlug={rsvpSlug} />
    </div>
  );
}
