import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero } from '@/components/invitation/primitives/Hero';
import { Details } from '@/components/invitation/primitives/Details';
import type { InvitationContent } from '@/lib/schemas/invitation';

const content: InvitationContent = {
  coupleFirstName: 'Sarah',
  couplePartnerName: 'Amine',
  initials: 'SA',
  eventDate: '2027-06-12T17:00:00.000Z',
  headline: 'We are getting married',
  message: 'Join us for the celebration.',
  venue: {
    name: 'Villa Rosa',
    addressLine: '12 Rue des Fleurs, Algiers',
    mapUrl: 'https://maps.example.com/villa-rosa',
  },
  schedule: [{ time: '17:00', title: 'Ceremony', description: 'Garden terrace' }],
  gallery: [],
};

describe('Hero', () => {
  it('renders both names', () => {
    render(<Hero content={content} />);
    expect(screen.getByText(/Sarah/)).toBeInTheDocument();
    expect(screen.getByText(/Amine/)).toBeInTheDocument();
  });

  it('renders the headline when present', () => {
    render(<Hero content={content} />);
    expect(screen.getByText('We are getting married')).toBeInTheDocument();
  });

  it('omits the headline element entirely when absent', () => {
    const { headline: _omitted, ...withoutHeadline } = content;
    render(<Hero content={withoutHeadline} />);
    expect(screen.queryByText('We are getting married')).not.toBeInTheDocument();
  });
});

describe('Details', () => {
  it('renders venue name and address', () => {
    render(<Details content={content} />);
    expect(screen.getByText('Villa Rosa')).toBeInTheDocument();
    expect(screen.getByText('12 Rue des Fleurs, Algiers')).toBeInTheDocument();
  });

  it('renders each schedule item', () => {
    render(<Details content={content} />);
    expect(screen.getByText('Ceremony')).toBeInTheDocument();
    expect(screen.getByText('17:00')).toBeInTheDocument();
  });

  it('renders a map link when mapUrl is present', () => {
    render(<Details content={content} />);
    expect(screen.getByRole('link', { name: /directions/i })).toHaveAttribute(
      'href',
      'https://maps.example.com/villa-rosa',
    );
  });

  it('omits the map link when mapUrl is absent', () => {
    const withoutMap = { ...content, venue: { ...content.venue, mapUrl: undefined } };
    render(<Details content={withoutMap} />);
    expect(screen.queryByRole('link', { name: /directions/i })).not.toBeInTheDocument();
  });
});
