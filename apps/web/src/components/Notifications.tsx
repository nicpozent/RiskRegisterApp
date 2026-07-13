import { useEffect, useState } from 'react';
import { Notifications as Api } from '../api.js';
import { navigate } from '../router.js';
import type { UserNotification } from '../types.js';

/** In-app notification feed: the signed-in user's risk notifications. */
export function Notifications({ onChange }: { onChange?: () => void }) {
  const [items, setItems] = useState<UserNotification[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    Api.list().then((r) => setItems(r.items)).catch((e) => setError(String(e.message ?? e)));
  }
  useEffect(load, []);

  async function open(n: UserNotification) {
    try {
      if (!n.readAt) { await Api.markRead(n.id); onChange?.(); }
      if (n.riskId) navigate(`/risk/${n.riskId}`);
      else load();
    } catch (e) { setError(String((e as Error).message ?? e)); }
  }

  async function markAll() {
    try { await Api.markAllRead(); load(); onChange?.(); }
    catch (e) { setError(String((e as Error).message ?? e)); }
  }

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div>
      <div className="row spread">
        <h2>Notifications {unread > 0 && <span className="muted">({unread} unread)</span>}</h2>
        <button onClick={markAll} disabled={unread === 0}>Mark all read</button>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <ul>
          {items.map((n) => (
            <li key={n.id} className="row" style={{ gap: 10, padding: '8px 0', cursor: 'pointer' }} onClick={() => open(n)}>
              <span className="unread-dot" style={{ opacity: n.readAt ? 0 : 1 }} />
              <span style={{ flex: 1 }}>
                {n.riskRef && <strong>{n.riskRef} </strong>}
                {n.summary ?? n.type}
                <span className="muted"> · {n.createdAt.replace('T', ' ').slice(0, 16)}</span>
              </span>
            </li>
          ))}
          {items.length === 0 && <li className="muted">No notifications.</li>}
        </ul>
      </div>
    </div>
  );
}
