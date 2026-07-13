#!/usr/bin/env bash
# Layer: identity provider (Entra ID) reachability.
# The API validates tokens against the tenant's OIDC metadata + JWKS. If these
# are unreachable or misconfigured, every request fails with 401.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
hdr "Identity provider (Entra ID / OIDC)"
load_env

if [ -z "${ENTRA_TENANT_ID:-}" ]; then warn "ENTRA_TENANT_ID not set — skipping"; exit "$EXIT_SKIP"; fi
if ! have curl; then warn "curl not available — skipping"; exit "$EXIT_SKIP"; fi

if [ "$ENTRA_TENANT_ID" = "00000000-0000-0000-0000-000000000000" ]; then
  warn "ENTRA_TENANT_ID is the placeholder — auth will not work until set"
fi

ISSUER="https://login.microsoftonline.com/${ENTRA_TENANT_ID}/v2.0"
DISCOVERY="${ISSUER}/.well-known/openid-configuration"
JWKS="https://login.microsoftonline.com/${ENTRA_TENANT_ID}/discovery/v2.0/keys"

fail=0
code="$(http_code "$DISCOVERY")"
if [ "$code" = 200 ]; then pass "OIDC discovery reachable ($code)"; else bad "OIDC discovery → $code"; hint "check network egress and ENTRA_TENANT_ID"; fail=1; fi

code="$(http_code "$JWKS")"
if [ "$code" = 200 ]; then
  keys="$(curl -sk -m "${HTTP_TIMEOUT:-5}" "$JWKS" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log((JSON.parse(s).keys||[]).length)}catch{console.log(0)}})' 2>/dev/null || echo 0)"
  if [ "${keys:-0}" -gt 0 ] 2>/dev/null; then pass "JWKS reachable with $keys signing key(s)"; else bad "JWKS returned no keys"; fail=1; fi
else bad "JWKS endpoint → $code"; fail=1; fi

[ -n "${ENTRA_API_AUDIENCE:-}" ] && pass "ENTRA_API_AUDIENCE configured ($ENTRA_API_AUDIENCE)" \
  || { bad "ENTRA_API_AUDIENCE not set — tokens will fail audience validation"; fail=1; }

[ "$fail" = 0 ] && { pass "identity provider reachable"; exit 0; } || { bad "identity provider problem"; exit 1; }
