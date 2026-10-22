import type { Metadata } from 'next';
import {
  CATALOGUES,
  getCatalogue,
} from '@/components/invitation/registry';
import { CataloguePage } from '@/components/store/CataloguePage';
import { socialMetadata } from '@/lib/metadata';

/* Both halves of the catalogue render from one component; everything that
   differs between them lives in the registry. */
const ENTRY = getCatalogue(CATALOGUES.FORMAL)!;

export const metadata: Metadata = {
  title: ENTRY.metaTitle,
  description: ENTRY.metaDescription,
  alternates: { canonical: ENTRY.href },
  ...socialMetadata({ title: `${ENTRY.metaTitle} · Rêve`, description: ENTRY.metaDescription }),
};

const START_MESSAGE =
  "Hello Rêve, I'd like to create an invitation. I have been looking at the collection.";

/**
 * The formal catalogue: weddings and engagements.
 *
 * Static: the registry is known at build time.
 */
export default function CollectionPage() {
  return <CataloguePage entry={ENTRY} startMessage={START_MESSAGE} />;
}
