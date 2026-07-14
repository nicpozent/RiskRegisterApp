import { useEffect, useState } from 'react';
import { Personnel, Admin as AdminApi } from '../api.js';
import type { Team, TeamMember, Swot, DirectoryUser } from '../types.js';

const EMPTY_SWOT: Swot = { strengths: '', weaknesses: '', opportunities: '', threats: '' };
const QUADRANTS: { key: keyof Swot; label: string }[] = [
  { key: 'strengths', label: 'Strengths' },
  { key: 'weaknesses', label: 'Weaknesses' },
  { key: 'opportunities', label: 'Opportunities' },
  { key: 'threats', label: 'Threats' },
];

/**
 * Personnel console: team SWOT and individual development plans. Content is
 * sensitive PII, encrypted at rest server-side; access is Admin/CISO or the
 * team's manager (the API enforces it — this view just reflects what returns).
 */
export function Teams({ isAdmin }: { isAdmin: boolean }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selected, setSelected] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTeams = () =>
    Personnel.teams().then(setTeams).catch((e) => setError(String(e.message ?? e)));
  useEffect(() => { loadTeams(); }, []);

  return (
    <div>
      <div className="row spread"><h2>Teams &amp; development</h2></div>
      <p className="muted" style={{ marginTop: 0 }}>
        SWOT notes and development plans are sensitive personnel data, encrypted at rest.
      </p>
      {error && <div className="error">{error}</div>}
      <div className="row" style={{ gap: 24, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 240 }}>
          <TeamList teams={teams} selected={selected} onSelect={setSelected} />
          {isAdmin && <CreateTeam onCreated={() => { loadTeams(); }} />}
        </div>
        <div style={{ flex: 1 }}>
          {selected
            ? <TeamDetail key={selected.id} team={selected} isAdmin={isAdmin} />
            : <p className="muted">Select a team.</p>}
        </div>
      </div>
    </div>
  );
}

function TeamList({ teams, selected, onSelect }:
  { teams: Team[]; selected: Team | null; onSelect: (t: Team) => void }) {
  if (teams.length === 0) return <p className="muted">No teams you can view.</p>;
  return (
    <ul className="plain-list">
      {teams.map((t) => (
        <li key={t.id}>
          <button className={selected?.id === t.id ? 'primary' : ''} style={{ width: '100%', textAlign: 'left' }}
            onClick={() => onSelect(t)}>{t.name}</button>
        </li>
      ))}
    </ul>
  );
}

function CreateTeam({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [managerId, setManagerId] = useState('');
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { AdminApi.users().then(setUsers).catch(() => {}); }, []);

  const submit = async () => {
    try {
      await Personnel.createTeam(name.trim(), managerId || null);
      setName(''); setManagerId(''); setError(null); onCreated();
    } catch (e) { setError(String((e as Error).message ?? e)); }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <h3>New team</h3>
      {error && <div className="error">{error}</div>}
      <div className="col" style={{ gap: 6 }}>
        <label htmlFor="team-name">Name</label>
        <input id="team-name" value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="team-manager">Manager</label>
        <select id="team-manager" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
          <option value="">— none —</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
        </select>
        <button className="primary" disabled={!name.trim()} onClick={submit}>Create team</button>
      </div>
    </div>
  );
}

function TeamDetail({ team, isAdmin }: { team: Team; isAdmin: boolean }) {
  const [swot, setSwot] = useState<Swot>(EMPTY_SWOT);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const loadMembers = () => Personnel.members(team.id).then(setMembers).catch((e) => setError(String(e.message ?? e)));
  useEffect(() => {
    setSelectedMember(null);
    Personnel.swot(team.id).then(setSwot).catch((e) => setError(String(e.message ?? e)));
    loadMembers();
  }, [team.id]);

  const saveSwot = async () => {
    try { setSwot(await Personnel.saveSwot(team.id, swot)); setStatus('SWOT saved.'); setError(null); }
    catch (e) { setError(String((e as Error).message ?? e)); }
  };

  return (
    <div>
      <h3>{team.name} — SWOT</h3>
      {error && <div className="error">{error}</div>}
      {status && <div className="muted">{status}</div>}
      <div className="swot-grid">
        {QUADRANTS.map((q) => (
          <div key={q.key} className="col" style={{ gap: 4 }}>
            <label htmlFor={`swot-${q.key}`}>{q.label}</label>
            <textarea id={`swot-${q.key}`} rows={4} value={swot[q.key]}
              onChange={(e) => { setStatus(null); setSwot({ ...swot, [q.key]: e.target.value }); }} />
          </div>
        ))}
      </div>
      <button className="primary" style={{ marginTop: 8 }} onClick={saveSwot}>Save SWOT</button>

      <h3 style={{ marginTop: 24 }}>Members</h3>
      <ul className="plain-list">
        {members.map((m) => (
          <li key={m.userId} className="row spread">
            <button style={{ textAlign: 'left' }} onClick={() => setSelectedMember(m)}>{m.displayName}</button>
            {isAdmin && <button onClick={async () => { await Personnel.removeMember(team.id, m.userId); loadMembers(); }}>Remove</button>}
          </li>
        ))}
        {members.length === 0 && <li className="muted">No members.</li>}
      </ul>
      {isAdmin && <AddMember teamId={team.id} onAdded={loadMembers} />}

      {selectedMember && <DevPlan key={selectedMember.userId} member={selectedMember} />}
    </div>
  );
}

function AddMember({ teamId, onAdded }: { teamId: string; onAdded: () => void }) {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [userId, setUserId] = useState('');
  useEffect(() => { AdminApi.users().then(setUsers).catch(() => {}); }, []);
  return (
    <div className="row" style={{ gap: 6, marginTop: 8 }}>
      <select aria-label="Add member" value={userId} onChange={(e) => setUserId(e.target.value)}>
        <option value="">— add member —</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
      </select>
      <button disabled={!userId} onClick={async () => { await Personnel.addMember(teamId, userId); setUserId(''); onAdded(); }}>Add</button>
    </div>
  );
}

function DevPlan({ member }: { member: TeamMember }) {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    Personnel.devPlan(member.userId)
      .then((d) => setContent(d.content)).catch((e) => setError(String(e.message ?? e)));
  }, [member.userId]);
  const save = async () => {
    try { const d = await Personnel.saveDevPlan(member.userId, content); setContent(d.content); setStatus('Development plan saved.'); setError(null); }
    catch (e) { setError(String((e as Error).message ?? e)); }
  };
  return (
    <div style={{ marginTop: 24 }}>
      <h3>Development plan — {member.displayName}</h3>
      {error && <div className="error">{error}</div>}
      {status && <div className="muted">{status}</div>}
      <textarea aria-label="Development plan" rows={6} style={{ width: '100%' }} value={content}
        onChange={(e) => { setStatus(null); setContent(e.target.value); }} />
      <button className="primary" style={{ marginTop: 8 }} onClick={save}>Save development plan</button>
    </div>
  );
}
