import { useMsal, AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react';
import { loginRequest } from './authConfig.js';
import { useRoute, navigate } from './router.js';
import { RiskRegister } from './components/RiskRegister.js';
import { RiskDetail } from './components/RiskDetail.js';
import { NewRisk } from './components/NewRisk.js';
import { Dashboard } from './components/Dashboard.js';
import { ControlLibrary } from './components/ControlLibrary.js';
import { Admin } from './components/Admin.js';
import { Reports } from './components/Reports.js';
import { ADMIN_ROLES } from './types.js';

export default function App() {
  const { instance, accounts } = useMsal();
  const route = useRoute();
  const account = accounts[0];
  // App roles ride in the token claims; used only to show/hide the Admin link
  // (the API still enforces authorization server-side).
  const roles = (account?.idTokenClaims as { roles?: string[] } | undefined)?.roles ?? [];
  const isAdmin = roles.some((r) => ADMIN_ROLES.includes(r));

  return (
    <>
      <header className="topbar">
        <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          Risk Register <span className="brand">· Biltema · Birgma</span>
        </h1>
        <AuthenticatedTemplate>
          <div className="row">
            <nav className="row">
              <a href="#/dashboard" className={route.name === 'dashboard' ? 'active' : ''}>Dashboard</a>
              <a href="#/" className={route.name === 'register' ? 'active' : ''}>Register</a>
              <a href="#/controls" className={route.name === 'controls' ? 'active' : ''}>Controls</a>
              <a href="#/reports" className={route.name === 'reports' ? 'active' : ''}>Reports</a>
              {isAdmin && <a href="#/admin" className={route.name === 'admin' ? 'active' : ''}>Admin</a>}
            </nav>
            <span className="who">{account?.name ?? account?.username}</span>
            <button onClick={() => instance.logoutRedirect()}>Sign out</button>
          </div>
        </AuthenticatedTemplate>
      </header>

      <main className="container">
        <UnauthenticatedTemplate>
          <div className="center">
            <p className="muted">Sign in with your organisation account to view the register.</p>
            <button className="primary" onClick={() => instance.loginRedirect(loginRequest)}>
              Sign in with Microsoft Entra ID
            </button>
          </div>
        </UnauthenticatedTemplate>

        <AuthenticatedTemplate>
          {route.name === 'register' && <RiskRegister />}
          {route.name === 'dashboard' && <Dashboard />}
          {route.name === 'controls' && <ControlLibrary />}
          {route.name === 'reports' && <Reports />}
          {route.name === 'admin' && <Admin />}
          {route.name === 'new' && <NewRisk />}
          {route.name === 'risk' && <RiskDetail id={route.id} />}
        </AuthenticatedTemplate>
      </main>
    </>
  );
}
