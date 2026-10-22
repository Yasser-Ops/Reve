/*
 * Tagged so the storefront's traffic can be told apart from everything else:
 * a visit carrying these came from a guest who scrolled to the end of a live
 * invitation. The slug says which wedding sent them.
 */
const CREDIT_SOURCE = 'invitation';
const CREDIT_MEDIUM = 'credit';

/** The query parameter that carries the referring wedding's slug. */
export const CREDIT_CAMPAIGN_PARAM = 'utm_campaign';

export function creditHref(slug: string) {
  const query = new URLSearchParams({
    utm_source: CREDIT_SOURCE,
    utm_medium: CREDIT_MEDIUM,
    [CREDIT_CAMPAIGN_PARAM]: slug,
  });
  return `/?${query.toString()}`;
}

/**
 * The studio's signature at the foot of a live invitation.
 *
 * Every wedding hands the product to a few hundred guests, some of whom are
 * planning their own; this is the one line that tells them where it came from.
 * Kept quiet on purpose: it sits below the couple's page, never inside it, and
 * opens in a new tab so a guest does not lose the invitation to follow it.
 *
 * Live invitations only (/i/[slug]). The storefront demos render templates
 * directly and never carry it.
 */
export function ReveCredit({ slug }: { slug: string }) {
  return (
    <footer className="bg-ink px-6 py-6 text-center">
      <a
        className="reve-crisp text-[12px] text-bone/70 underline decoration-bone/25 underline-offset-4 transition-colors hover:text-bone hover:decoration-bone/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone"
        href={creditHref(slug)}
        rel="noopener"
        target="_blank"
      >
        Invitation designed by <span className="reve-display">Rêve</span>
      </a>
    </footer>
  );
}
