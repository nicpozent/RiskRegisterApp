#!/usr/bin/env bash
# Generate a self-signed certificate for LOCAL DEVELOPMENT only.
# Production uses certificates issued by the enterprise PKI / a managed CA,
# stored in Key Vault / KMS and auto-rotated — never self-signed, never in git.
set -euo pipefail
DIR="\$(cd "\$(dirname "\$0")/../nginx/certs" && pwd)"
openssl req -x509 -newkey rsa:4096 -sha256 -days 365 -nodes \\
  -keyout "\$DIR/server.key" -out "\$DIR/server.pem" \\
  -subj "/C=SE/O=Biltema Birgma/CN=localhost" \\
  -addext "subjectAltName=DNS:localhost"
echo "Dev certificate written to \$DIR (TLS 1.2/1.3)."
