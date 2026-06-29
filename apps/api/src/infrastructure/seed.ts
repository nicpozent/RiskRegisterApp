// Seed the framework registry and a starter control set. Run: npm run seed
// The full catalogue (incl. all 93 ISO 27001 Annex A controls + regional
// regulations with guidance) ships in catalogue.seed.json alongside this file.
import { pool } from './db.js';
import { FRAMEWORKS } from '@rr/frameworks-data';

async function main() {
  for (const f of FRAMEWORKS) {
    await pool.query(
      `INSERT INTO framework (id,name,authority,region,kind,description)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET name=excluded.name, description=excluded.description`,
      [f.id, f.name, f.authority, f.region, f.kind, f.description]);
  }
  console.log(`Seeded ${FRAMEWORKS.length} frameworks. Load controls from catalogue.seed.json next.`);
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
