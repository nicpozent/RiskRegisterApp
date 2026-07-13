# ABB-B2: Control & Framework Catalogue

- **Domain:** Business
- **Type:** Architecture Building Block (capability — the *what*, technology-agnostic)
- **Realized by:** [SBB-B2](SBB/SBB.md)

## Capability

Maintain an authoritative multi-framework catalogue of controls and map them to risks for coverage analysis.

## Required characteristics

- Versioned reference data shared across tiers
- Uniqueness per (framework, ref)
- Custom-control extension
- Coverage / “mapped” metrics per framework

## Interfaces / responsibilities

- `list/search controls`
- `list frameworks + coverage`
- `create custom control (privileged)`

## Reuse potential

The catalogue package is reusable as enterprise GRC reference data.

---
*An ABB defines a required capability independent of any product. The concrete
implementation in the Risk Register platform is documented as its Solution
Building Block: [SBB-B2](SBB/SBB.md).*
