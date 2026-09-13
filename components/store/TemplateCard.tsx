import Image from 'next/image';
import Link from 'next/link';
import type { TemplateEntry } from '@/components/invitation/registry';

/**
 * The composed mockup's pixel size, from `scripts/compose-mockup.mjs`.
 *
 * Every design's card is cropped to the same box by that script, so this is a
 * property of the format rather than of any one design. Declared because
 * `next/image` needs intrinsic dimensions for a runtime `src` and will
 * otherwise reserve a box of the wrong shape — a square reservation around a
 * wider-than-tall image letterboxes it, which reads as the photograph having
 * too much empty ground around it.
 */
const CARD_WIDTH = 2000;
const CARD_HEIGHT = 2000;

/**
 * One design in the collection: its envelope on a phone, its opening page on
 * the card beside it, photographed.
 *
 * The pairing is the card's whole argument. The envelope alone says nothing
 * about the art direction — every design ships the same cream linen — and the
 * invitation alone loses the ceremony the product is sold on. Together they
 * read as one sentence: this arrives, and this is what it becomes.
 *
 * No phone frame or ground is drawn here. Both are in the photograph, which is
 * also what makes this image the house format for advertising: the storefront
 * and an ad are the same picture rather than two that drift apart.
 *
 * The whole card is the link. There is no button, because a button inside a
 * card that is already a link gives a visitor two targets for one destination
 * and competes with the page's real call to action further down.
 */
export function TemplateCard({ entry }: { entry: TemplateEntry }) {
  return (
    <article className="group">
      <Link
        className="block overflow-hidden rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
        href={`/weddings/${entry.slug}`}
      >
        <Image
          alt={`${entry.name}: the sealed envelope, and the invitation it opens into`}
          className="w-full transition-transform duration-700 ease-out group-hover:scale-[1.02]"
          height={CARD_HEIGHT}
          priority
          sizes="(min-width: 1024px) 23vw, (min-width: 640px) 48vw, 88vw"
          src={entry.preview}
          width={CARD_WIDTH}
        />
      </Link>

      <h2 className="reve-display mt-4 text-[1.35rem]">
        <Link
          className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
          href={`/weddings/${entry.slug}`}
        >
          {entry.name}
        </Link>
      </h2>

      <p className="mt-2 text-[13.5px] leading-relaxed text-cocoa">
        {entry.summary}
      </p>
    </article>
  );
}
