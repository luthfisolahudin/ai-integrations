# Update the copied packages

A downstream checkout owns `packages/provider`, `adapters/*` and its docs; it
copies `packages/runtime` and `packages/dev` from a tagged release of
`luthfisolahudin/ai-integrations`.

```sh
pnpm run sync:upstream --tag v2.2.0
git diff -- packages/runtime packages/dev ai-integrations.lock.json
pnpm check
```

`ai-integrations.lock.json` lists every copied file with its sha256. `pnpm check`
verifies it first, so editing a copied file is a lock violation, not a quiet
fork. The upstream-owned names (`ai-integrations-*`) are identical in every
checkout, so the copy needs no rewrite of package names or imports.

Commit `packages/runtime`, `packages/dev`, and the lock in one commit. To roll
back, revert that commit and run `pnpm check`.

## Why copy, not depend

The hosts load TypeScript straight from the checkout. Node refuses to
type-strip TypeScript inside `node_modules`, so an npm dependency containing
`.ts` cannot run; a workspace link can, but it ties a vendor checkout to a
second checkout. A verified copy is the one shape that is self-contained.

## Schema migrations

### PACK_SCHEMA_VERSION 2

- Added `HttpQuotaWindow`, `HttpQuotaAccount`, and `HttpQuotaResponse` in
  `packages/runtime/contract/src/quota.ts`, plus optional `hooks.quota` on
  `PackHooks`.
- Downstream packs that do not report quota only need `PACK_SCHEMA_VERSION`
  (already imported from `@luthfisolahudin/ai-integrations-contract`).
