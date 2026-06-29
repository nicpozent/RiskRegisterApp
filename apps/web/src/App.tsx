import { useEffect, useState } from 'react';
import { useMsal, AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react';
import { loginRequest } from './authConfig.js';
import { Risks } from './api.js';

export default function App() {
  const { instance } = useMsal();
  const [risks, setRisks] = useState<any[]>([]);
  useEffect(() => { Risks.list().then(setRisks).catch(() => {}); }, []);
  return (
    <div style={{ fontFamily: 'Inter, system-ui', padding: 32 }}>
      <h1>Risk Register — Biltema · Birgma</h1>
      <UnauthenticatedTemplate>
        <button onClick={() => instance.loginRedirect(loginRequest)}>
          Sign in with Microsoft Entra ID
        </button>
      </UnauthenticatedTemplate>
      <AuthenticatedTemplate>
        <p>{risks.length} risks in the register.</p>
        <ul>{risks.map(r => <li key={r.id}>{r.ref} — {r.title} ({r.residualBand})</li>)}</ul>
      </AuthenticatedTemplate>
    </div>
  );
}
