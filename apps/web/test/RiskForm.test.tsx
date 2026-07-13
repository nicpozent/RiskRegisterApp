import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RiskForm } from '../src/components/RiskForm.js';

describe('RiskForm', () => {
  it('hides the status selector on create and shows it on edit', () => {
    const { rerender } = render(
      <RiskForm submitLabel="Create" onSubmit={() => {}} onCancel={() => {}} />);
    expect(screen.queryByLabelText('Status')).toBeNull();

    rerender(<RiskForm submitLabel="Save" showStatus onSubmit={() => {}} onCancel={() => {}} />);
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });

  it('submits a trimmed, typed payload', async () => {
    const onSubmit = vi.fn();
    render(<RiskForm submitLabel="Create" onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText('Title'), '  Unencrypted backups  ');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const body = onSubmit.mock.calls[0][0];
    expect(body.title).toBe('Unencrypted backups');           // trimmed
    expect(body.treatment).toBe('Mitigate');                  // default
    expect(typeof body.inherentL).toBe('number');             // coerced from the select
    expect('status' in body).toBe(false);                     // no status on create
  });

  it('calls onCancel from the Cancel button', async () => {
    const onCancel = vi.fn();
    render(<RiskForm submitLabel="Create" onSubmit={() => {}} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
