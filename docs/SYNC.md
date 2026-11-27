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

### Quota window absolutes and pooling (schema 2, additive)

No `PACK_SCHEMA_VERSION` bump: `PackHooks.quota` keeps its signature, and the
new surface is optional fields plus new exports, so an existing pack compiles
and runs unchanged.

- `HttpQuotaWindow` now accepts optional `used` and `limit`, the absolute
  amounts behind `usedPercent`. An engine aggregator uses them to pool several
  accounts of one product exactly. They are source-internal: `fetchQuota`
  strips them before the response leaves the engine, so the served body still
  matches the documented protocol.
- `parseQuotaResetAt` and `quotaWindowLabel` moved into the contract, because
  every pack was rewriting the same epoch-seconds/epoch-ms/ISO parser and the
  same provider naming.
- `aggregateQuotaAccounts` in the catalog pools accounts whose labels share a
  provider. **Report `used`/`limit` when the vendor gives you absolute amounts**:
  a percentage-only source can only be pooled approximately, and the aggregator
  marks that case with a trailing `~`.
