import React from 'react';
import { createRoot } from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';
import { pca } from './authConfig.js';
import App from './App.js';

// This SPA is the polished prototype's production shell. The full UI
// (dashboards, register, control library, admin) is in the design prototype.
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MsalProvider instance={pca}><App /></MsalProvider>
  </React.StrictMode>
);
