# ABB-T5: TLS / PKI

- **Domain:** Technology
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-T5](SBB/SBB.md)
- **Decision record:** ADR-0012

## Capability

Encrypted transport everywhere with managed, rotated certificates.

## Required characteristics

- TLS 1.2/1.3, modern ciphers, HSTS
- Managed issuance + rotation (cert-manager)
- Optional internal mTLS
- No self-signed certs in prod or git

## Interfaces / responsibilities

- `TLS at edge; cert issuance`

## Reuse potential

Transport-security block for any web system.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-T5](SBB/SBB.md).*
