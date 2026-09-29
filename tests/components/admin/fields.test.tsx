import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field, OrderFields } from '@/components/admin/fields';

/* The client page renders the client's notes, every order's upgrade amount,
   and the "add an order" fields together. Ids taken from field names
   collided, so a label named one field and focused another. */
describe('admin fields', () => {
  it('gives each label its own field when names repeat on a page', () => {
    render(
      <>
        <Field label="Client notes" name="notes" />
        <OrderFields />
        <Field label="New total (USD)" name="amount" />
      </>,
    );

    expect(screen.getByLabelText('Client notes')).not.toBe(screen.getByLabelText('Order notes'));
    expect(screen.getByLabelText('New total (USD)')).not.toBe(
      screen.getByLabelText('Amount (USD)'),
    );
  });
});
