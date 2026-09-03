import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Gallery } from '@/components/invitation/primitives/Gallery';
import type { Entitlements, InvitationContent } from '@/lib/schemas/invitation';

const content: InvitationContent = {
  coupleFirstName: 'Sarah',
  couplePartnerName: 'Amine',
  initials: 'SA',
  eventDate: '2027-06-12T17:00:00.000Z',
  venue: { name: 'Villa Rosa', addressLine: '12 Rue des Fleurs' },
  schedule: [],
  gallery: [
    { src: '/photos/one.webp', alt: 'By the sea' },
    { src: '/photos/two.webp', alt: 'In the garden' },
  ],
};

const granted: Entitlements = { rsvp: false, portal: false, gallery: true };
const withheld: Entitlements = { rsvp: false, portal: false, gallery: false };

describe('Gallery', () => {
  it('renders every image when the gallery entitlement is granted', () => {
    render(<Gallery content={content} entitlements={granted} />);
    expect(screen.getByAltText('By the sea')).toBeInTheDocument();
    expect(screen.getByAltText('In the garden')).toBeInTheDocument();
  });

  it('renders nothing when the gallery entitlement is withheld', () => {
    const { container } = render(<Gallery content={content} entitlements={withheld} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when entitled but no photos exist', () => {
    const { container } = render(
      <Gallery content={{ ...content, gallery: [] }} entitlements={granted} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
