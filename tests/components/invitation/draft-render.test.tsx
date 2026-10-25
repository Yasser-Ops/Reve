import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/invitation/TemplateRenderer', () => ({
  TemplateRenderer: ({ templateSlug }: { templateSlug: string }) => (
    <div>rendered {templateSlug}</div>
  ),
}));

import { DraftRender, PLACEHOLDER_NOTE } from '@/components/invitation/DraftRender';
import { TEMPLATES } from '@/components/invitation/registry';
/* Empty objects parse to the schemas' defaults. */
const DEFAULT_ENTITLEMENTS = {};
const DEFAULT_THEME = {};
import { SAMPLE_CONTENT } from '@/lib/sample-invitation';

const MESSAGE = 'Still being set.';

describe('DraftRender', () => {
  it('shows the given message for a design it does not know', () => {
    render(
      <DraftRender
        content={{}}
        entitlements={DEFAULT_ENTITLEMENTS}
        incompleteMessage={MESSAGE}
        templateSlug="no-such-design"
        theme={DEFAULT_THEME}
      />,
    );
    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
  });

  it('renders an empty draft with placeholders, and says which', () => {
    render(
      <DraftRender
        content={{ coupleFirstName: 'Maya' }}
        entitlements={DEFAULT_ENTITLEMENTS}
        incompleteMessage={MESSAGE}
        templateSlug="lin"
        theme={DEFAULT_THEME}
      />,
    );
    expect(screen.getByText('rendered lin')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      `${PLACEHOLDER_NOTE} second name, initials, date and arrival time, venue.`,
    );
  });

  it('renders the template when the content satisfies its schema', () => {
    const entry = TEMPLATES.find((candidate) => candidate.schema.safeParse(SAMPLE_CONTENT).success);
    expect(entry).toBeDefined();

    render(
      <DraftRender
        content={SAMPLE_CONTENT}
        entitlements={DEFAULT_ENTITLEMENTS}
        incompleteMessage={MESSAGE}
        templateSlug={entry!.slug}
        theme={DEFAULT_THEME}
      />,
    );
    expect(screen.getByText(`rendered ${entry!.slug}`)).toBeInTheDocument();
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
