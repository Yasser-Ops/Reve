import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StageStepper } from '@/components/admin/StageStepper';

describe('StageStepper', () => {
  it('marks stages done up to the current one', () => {
    const { container } = render(<StageStepper status="in_design" tier="managed" />);

    expect(container.querySelectorAll('[data-state="done"]')).toHaveLength(2);
    expect(screen.getByText('In design').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('greys every stage of a cancelled order', () => {
    const { container } = render(<StageStepper status="cancelled" tier="managed" />);
    expect(container.querySelectorAll('[data-state="off"]')).toHaveLength(5);
  });
});
