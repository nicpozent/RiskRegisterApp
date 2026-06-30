#!/usr/bin/env bash
# Layer: edge (NGINX/Ingress) — TLS, routing and security headers.
# Verifies the only published surface behaves: HTTPS works, /api routes to the
# API, the SPA is served, and hardening headers are present.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
hdr "Edge: TLS, routing & security headers"

EDGE_URL="${EDGE_URL:-https://localhost}"
if ! have curl; then warn "curl not available — skipping"; exit "$EXIT_SKIP"; fi
info "target: $EDGE_URL"

# Reachability
code="$(http_code "$EDGE_URL/")"
if [ "$code" = 000 ]; then bad "edge unreachable at $EDGE_URL"; hint "is nginx/compose up? correct EDGE_URL?"; exit 1; fi
pass "edge reachable (/ → $code)"

fail=0
# Routing: API health reachable through the /api prefix (prefix must be stripped).
code="$(http_code "$EDGE_URL/api/healthz")"
[ "$code" = 200 ] && pass "/api/healthz → 200 (prefix routing OK)" \
  || { bad "/api/healthz → $code"; hint "check the /api rewrite (ingress rewrite-target / nginx proxy_pass)"; fail=1; }

# Auth gate through the edge.
code="$(http_code "$EDGE_URL/api/risks")"
[ "$code" = 401 ] && pass "/api/risks (no token) → 401" || { warn "/api/risks → $code (expected 401)"; }

# Security headers
headers="$(curl -skI -m "${HTTP_TIMEOUT:-5}" "$EDGE_URL/" 2>/dev/null)"
check_hdr() { # <header> <label>
  if printf '%s' "$headers" | grep -qi "^$1:"; then pass "$2 present"; else warn "$2 missing"; hint "add '$1' at the edge"; fi
}
check_hdr "Strict-Transport-Security" "HSTS"
check_hdr "X-Content-Type-Options"    "X-Content-Type-Options"
check_hdr "Content-Security-Policy"   "CSP"
check_hdr "X-Frame-Options"           "X-Frame-Options"

[ "$fail" = 0 ] && { pass "edge healthy"; exit 0; } || { bad "edge routing problem"; exit 1; }
