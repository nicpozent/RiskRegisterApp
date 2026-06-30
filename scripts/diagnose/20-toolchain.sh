#!/usr/bin/env bash
# Layer: build toolchain / dependencies.
# Verifies the repo can build and run: node version, lockfile, installed
# dependencies, and that the shared workspace package is compiled.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
hdr "Toolchain & dependencies"
cd "$REPO_ROOT"

fail=0

if have node; then
  ver="$(node -v)"; major="${ver#v}"; major="${major%%.*}"
  if [ "$major" -ge 20 ] 2>/dev/null; then pass "node $ver (>=20)"; else bad "node $ver (<20)"; hint "install Node 20+"; fail=1; fi
else bad "node not found"; hint "install Node 20+"; fail=1; fi

have npm && pass "npm $(npm -v)" || { bad "npm not found"; fail=1; }

[ -f package-lock.json ] && pass "package-lock.json present (reproducible installs)" \
  || { bad "package-lock.json missing"; hint "commit a lockfile; build with 'npm ci'"; fail=1; }

[ -d node_modules ] && pass "node_modules installed" \
  || { bad "dependencies not installed"; hint "run 'npm ci'"; fail=1; }

if [ -f packages/frameworks-data/dist/index.js ]; then
  pass "@rr/frameworks-data is built (dist present)"
else
  bad "@rr/frameworks-data not built — API import will fail at runtime"
  hint "run 'npm run build -w @rr/frameworks-data' (or 'npm ci', which runs prepare)"
  fail=1
fi

[ "$fail" = 0 ] && { pass "toolchain healthy"; exit 0; } || { bad "toolchain problem"; exit 1; }
