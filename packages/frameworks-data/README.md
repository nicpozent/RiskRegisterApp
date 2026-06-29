# @rr/frameworks-data

Shared control-catalogue contracts and the framework registry (41 frameworks).

The **full control text** — all 93 ISO 27001:2022 Annex A controls plus the
regional regulations with per-control guidance — lives in
`catalogue.seed.json` and is loaded into the `framework` / `control` tables by
`apps/api` (`npm run seed`). Updating the catalogue = edit the seed (or, at
runtime, manage controls through the admin API) and ship a new release; every
tier reads the same `Control` / `Framework` types from here.
