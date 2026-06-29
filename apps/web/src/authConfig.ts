import { Configuration, PublicClientApplication } from '@azure/msal-browser';

// SSO against Entra ID — Authorization Code flow with PKCE. Public values only.
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_ENTRA_SPA_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_ENTRA_TENANT_ID}`,
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation: 'sessionStorage' }, // tokens in memory/session — never localStorage
};
export const loginRequest = { scopes: [import.meta.env.VITE_API_SCOPE] };
export const pca = new PublicClientApplication(msalConfig);
