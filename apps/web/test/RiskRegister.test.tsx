import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { RiskView } from '../src/types.js';

const { list } = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('../src/api.js', () => ({ Risks: { list } }));
vi.mock('../src/router.js', () => ({ navigate: vi.fn() }));

import { RiskRegister } from '../src/components/RiskRegister.js';

const risk = (over: Partial<RiskView>): RiskView => ({
  id: 'r1', ref: 'RR-001', title: 'Unencrypted backups', stakeholderIds: [], controlIds: [],
  inherentL: 4, inherentI: 5, residualL: 2, residualI: 3, treatment: 'Mitigate', status: 'open',
  version: 0, inherentScore: 20, inherentBand: 'Critical', residualScore: 6, residualBand: 'Medium',
  reduction: 0.7, ...over,
});

describe('RiskRegister', () => {
  beforeEach(() => list.mockReset());

  it('renders a row per risk with its bands', async () => {
    list.mockResolvedValue({ items: [risk({})], total: 1 });
    render(<RiskRegister />);
    expect(await screen.findByText('RR-001')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('shows an empty state when there are no risks', async () => {
    list.mockResolvedValue({ items: [], total: 0 });
    render(<RiskRegister />);
    expect(await screen.findByText(/No risks yet/i)).toBeInTheDocument();
  });

  it('disables Previous on the first page and Next when the page is the last', async () => {
    list.mockResolvedValue({ items: [risk({})], total: 1 });
    render(<RiskRegister />);
    await screen.findByText('RR-001');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
