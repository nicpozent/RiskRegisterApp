import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  API_PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string(),
  CORS_ORIGIN: z.string().default('https://localhost'),
  ENTRA_TENANT_ID: z.string(),
  ENTRA_API_AUDIENCE: z.string(),
});

export const env = schema.parse(process.env);
export const OIDC_ISSUER = `https://login.microsoftonline.com/${env.ENTRA_TENANT_ID}/v2.0`;
export const JWKS_URI    = `https://login.microsoftonline.com/${env.ENTRA_TENANT_ID}/discovery/v2.0/keys`;
