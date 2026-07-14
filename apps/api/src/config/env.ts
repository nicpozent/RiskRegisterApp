import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  API_PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string(),
  // Enable client TLS only when the DB endpoint actually serves it (managed
  // Postgres). The local docker-compose db does not, so this defaults off.
  DATABASE_SSL: z.string().default('false').transform(v => v === 'true' || v === '1'),
  CORS_ORIGIN: z.string().default('https://localhost'),
  ENTRA_TENANT_ID: z.string(),
  ENTRA_API_AUDIENCE: z.string(),
  // Personnel module (team SWOT + development plans) is sensitive PII and is
  // gated OFF by default until DPIA sign-off. Set to "true"/"1" to enable.
  PERSONNEL_MODULE_ENABLED: z.string().default('false').transform(v => v === 'true' || v === '1'),
});

export const env = schema.parse(process.env);
export const OIDC_ISSUER = `https://login.microsoftonline.com/${env.ENTRA_TENANT_ID}/v2.0`;
export const JWKS_URI    = `https://login.microsoftonline.com/${env.ENTRA_TENANT_ID}/discovery/v2.0/keys`;
