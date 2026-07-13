import { useEffect, useState } from 'react';
import { Admin as AdminApi } from '../api.js';
import type { AuditEvent, DirectoryUser } from '../types.js';

const PAGE = 25;
const ENTITIES = ['', 'risk', 'treatment_action', 'risk_control'];

function AuditLog() {
  const [items, setItems] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [entity, setEntity] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setOffset(0); }, [entity]);
  useEffect(() => {
    let live = true;
    AdminApi.audit({ entity: entity || undefined, limit: PAGE, offset })
      .then((p) => { if (live) { setItems(p.items); setTotal(p.total); setError(null); } })
      .catch((e) => { if (live) setError(String(e.message ?? e)); });
    return () => { live = false; };
  }, [entity, offset]);

  const to = Math.min(offset + PAGE, total);

  return (
    <div>
      <div className="row" style={{ margin: '12px 0' }}>
        <label className="muted">Entity</label>
        <select value={entity} onChange={(e) => setEntity(e.target.value)} style={{ maxWidth: 220 }}>
          {ENTITIES.map((e) => <option key={e} value={e}>{e || 'all'}</option>)}
        </select>
      </div>
      {error && <div className="error">{error}</div>}
      <table>
        <thead><tr><th>When (UTC)</th><th>Actor</th><th>Action</th><th>Entity</th><th>Entity id</th></tr></thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id} style={{ cursor: 'default' }}>
              <td className="muted">{a.at.replace('T', ' ').slice(0, 19)}</td>
              <td className="muted">{a.actorOid}</td>
              <td>{a.action}</td>
              <td>{a.entity}</td>
              <td className="muted">{a.entityId ?? '—'}</td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={5} className="muted">No audit events.</td></tr>}
        </tbody>
      </table>
      <div className="pager">
        <span className="muted">{total === 0 ? 0 : offset + 1}–{to} of {total}</span>
        <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</button>
        <button disabled={to >= total} onClick={() => setOffset(offset + PAGE)}>Next</button>
      </div>
    </div>
  );
}

function Users() {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { AdminApi.users().then(setUsers).catch((e) => setError(String(e.message ?? e))); }, []);
  if (error) return <div className="error">{error}</div>;
  return (
    <table>
      <thead><tr><th>Name</th><th>Email</th><th>Entra OID</th><th>Provisioned</th></tr></thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id} style={{ cursor: 'default' }}>
            <td>{u.displayName}</td><td>{u.email}</td>
            <td className="muted">{u.entraOid}</td>
            <td className="muted">{u.createdAt.slice(0, 10)}</td>
          </tr>
        ))}
        {users.length === 0 && <tr><td colSpan={4} className="muted">No users provisioned yet.</td></tr>}
      </tbody>
    </table>
  );
}

/** Governance console: append-only audit trail + provisioned user directory. */
export function Admin() {
  const [tab, setTab] = useState<'audit' | 'users'>('audit');
  return (
    <div>
      <div className="row spread"><h2>Admin</h2></div>
      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
        <button className={tab === 'audit' ? 'primary' : ''} onClick={() => setTab('audit')}>Audit trail</button>
        <button className={tab === 'users' ? 'primary' : ''} onClick={() => setTab('users')}>Users</button>
      </div>
      {tab === 'audit' ? <AuditLog /> : <Users />}
    </div>
  );
}
