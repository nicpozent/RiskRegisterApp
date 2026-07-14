import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { teams, swot, members, saveSwot } = vi.hoisted(() => ({
  teams: vi.fn(), swot: vi.fn(), members: vi.fn(), saveSwot: vi.fn(),
}));
vi.mock('../src/api.js', () => ({
  Personnel: { teams, swot, members, saveSwot },
  Admin: { users: vi.fn().mockResolvedValue([]) },
}));

import { Teams } from '../src/components/Teams.js';

describe('Teams (personnel module)', () => {
  beforeEach(() => {
    teams.mockReset(); swot.mockReset(); members.mockReset(); saveSwot.mockReset();
    swot.mockResolvedValue({ strengths: 'strong delivery', weaknesses: '', opportunities: '', threats: '' });
    members.mockResolvedValue([]);
  });

  it('lists teams and shows the (decrypted) SWOT when one is selected', async () => {
    teams.mockResolvedValue([{ id: 't1', name: 'Alpha', managerId: null, createdAt: '2026-01-01' }]);
    render(<Teams isAdmin={false} />);

    const teamBtn = await screen.findByRole('button', { name: 'Alpha' });
    await userEvent.click(teamBtn);

    // SWOT loads and the plaintext value is shown in the Strengths box.
    await waitFor(() => expect(screen.getByLabelText('Strengths')).toHaveValue('strong delivery'));
    expect(swot).toHaveBeenCalledWith('t1');
  });

  it('shows an empty state when the user can view no teams', async () => {
    teams.mockResolvedValue([]);
    render(<Teams isAdmin={false} />);
    expect(await screen.findByText('No teams you can view.')).toBeInTheDocument();
  });
});
