import { buildApp } from './interface/http.js';
import { env } from './config/env.js';

const app = buildApp();
app.listen(env.API_PORT, () => {
  console.log(`Risk Register API listening on :${env.API_PORT} (${env.NODE_ENV})`);
});
