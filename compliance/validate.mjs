#!/usr/bin/env node
// Gate the controls-as-code self-assessment: validate the schema and prove that
// every "implemented" control still points at evidence that exists in the repo.
// Run in CI so the assessment can't silently drift from the code.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const STATUSES = new Set(['implemented', 'planned']);

const errors = [];
const fail = (msg) => errors.push(msg);

let doc;
try {
  doc = JSON.parse(readFileSync(join(here, 'controls.json'), 'utf8'));
} catch (e) {
  console.error(`controls.json is not valid JSON: ${e.message}`);
  process.exit(1);
}

if (!Array.isArray(doc.controls) || doc.controls.length === 0) {
  fail('controls[] is missing or empty');
}

const seen = new Set();
let implemented = 0;
let planned = 0;

for (const c of doc.controls ?? []) {
  const id = c.id ?? '(no id)';
  if (!c.id) fail('a control is missing an id');
  else if (seen.has(c.id)) fail(`duplicate control id: ${c.id}`);
  else seen.add(c.id);

  if (!c.title) fail(`${id}: missing title`);
  if (!c.statement) fail(`${id}: missing statement`);
  if (!STATUSES.has(c.status)) fail(`${id}: status must be one of ${[...STATUSES].join(', ')}`);
  if (!c.frameworks || typeof c.frameworks !== 'object' || Object.keys(c.frameworks).length === 0) {
    fail(`${id}: must map to at least one framework`);
  } else {
    for (const [fw, clauses] of Object.entries(c.frameworks)) {
      if (!Array.isArray(clauses) || clauses.length === 0) fail(`${id}: framework "${fw}" has no clauses`);
    }
  }
  if (!Array.isArray(c.evidence)) fail(`${id}: evidence must be an array`);

  if (c.status === 'implemented') {
    implemented++;
    if (!c.evidence?.length) fail(`${id}: an implemented control needs at least one evidence path`);
    for (const p of c.evidence ?? []) {
      if (!existsSync(join(repoRoot, p))) fail(`${id}: evidence path not found: ${p}`);
    }
  } else if (c.status === 'planned') {
    planned++;
  }
}

if (errors.length) {
  console.error(`controls-as-code assessment FAILED (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`controls-as-code assessment OK: ${seen.size} controls (${implemented} implemented, ${planned} planned), all evidence paths present.`);
