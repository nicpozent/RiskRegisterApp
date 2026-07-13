import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RiskView } from '../src/types.js';

// Defined via vi.hoisted so they exist when the hoisted vi.mock factory runs.
const { ConflictError, get, update } = vi.hoisted(() => {
  class ConflictError extends Error {}
  return { ConflictError, get: vi.fn(), update: vi.fn() };
});

vi.mock('../src/api.js', () => ({
  ConflictError,
  Risks: { get, update },
  Reports: { evidence: vi.fn() },
}));
vi.mock('../src/router.js', () => ({ navigate: vi.fn() }));
vi.mock('../src/components/RiskControls.js', () => ({ RiskControls: () => null }));
vi.mock('../src/components/RiskActions.js', () => ({ RiskActions: () => null }));

import { RiskDetail } from '../src/components/RiskDetail.js';

const base: RiskView = {
  id: 'r1', ref: 'RR-007', title: 'Legacy VPN', stakeholderIds: [], controlIds: [],
  inherentL: 3, inherentI: 3, residualL: 2, residualI: 2, treatment: 'Mitigate', status: 'open',
  version: 2, inherentScore: 9, inherentBand: 'High', residualScore: 4, residualBand: 'Medium',
  reduction: 0.55,
};

describe('RiskDetail', () => {
  beforeEach(() => { get.mockReset(); update.mockReset(); });

  it('renders the risk after loading', async () => {
    get.mockResolvedValue(base);
    render(<RiskDetail id="r1" />);
    expect(await screen.findByText(/RR-007 — Legacy VPN/)).toBeInTheDocument();
  });

  it('surfaces a 409 as a friendly conflict message and reloads', async () => {
    get.mockResolvedValue(base);
    update.mockRejectedValueOnce(new ConflictError('This risk was changed by someone else. Reload and retry.'));
    render(<RiskDetail id="r1" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.getByText(/changed by someone else/i)).toBeInTheDocument());
    // update was attempted with the last-seen version, then get() re-fetched the winner.
    expect(update).toHaveBeenCalledWith('r1', expect.any(Object), 2);
    expect(get).toHaveBeenCalledTimes(2);
  });
});
