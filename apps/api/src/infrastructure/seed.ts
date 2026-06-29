// Seed the framework registry and the starter control catalogue. Run: npm run seed
// Idempotent: re-running upserts frameworks and controls without duplicating rows.
import { pool } from './db.js';
import { FRAMEWORKS, CONTROLS } from '@rr/frameworks-data';

async function main() {
  for (const f of FRAMEWORKS) {
    await pool.query(
      `INSERT INTO framework (id,name,authority,region,kind,description)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET name=excluded.name, description=excluded.description`,
      [f.id, f.name, f.authority, f.region, f.kind, f.description]);
  }

  for (const c of CONTROLS) {
    await pool.query(
      `INSERT INTO control (framework,ref,title,grp,help,is_custom)
         VALUES ($1,$2,$3,$4,$5,false)
         ON CONFLICT (framework,ref) DO UPDATE
           SET title=excluded.title, grp=excluded.grp, help=excluded.help`,
      [c.framework, c.ref, c.title, c.group, c.help ?? null]);
  }

  console.log(`Seeded ${FRAMEWORKS.length} frameworks and ${CONTROLS.length} controls.`);
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
