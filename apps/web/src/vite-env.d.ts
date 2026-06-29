/// <reference types="vite/client" />

// Typed env contract for the SPA (only public VITE_* values).
interface ImportMetaEnv {
  readonly VITE_ENTRA_TENANT_ID: string;
  readonly VITE_ENTRA_SPA_CLIENT_ID: string;
  readonly VITE_API_SCOPE: string;
  readonly VITE_API_BASE?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
