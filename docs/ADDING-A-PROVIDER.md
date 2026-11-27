# Add a provider

Copy the layout, rename the example vendor, fill in the vendor facts:

```sh
npx degit luthfisolahudin/ai-integrations/packages/runtime#v2.2.0 packages/runtime
npx degit luthfisolahudin/ai-integrations/packages/dev#v2.2.0 packages/dev
```

1. Rename `packages/provider`'s package to
   `@luthfisolahudin/<vendor>-integrations-provider` and replace the example
   pack with yours (`pack.ts`, `curated.ts`, `effort.ts`, `invariants.ts`,
   `fallback.ts`, `fixtures/`).
2. Point the adapters at your provider:
   `adapters/pi/src/index.ts` and `adapters/opencode/src/index.ts` import
   `provider` from your package — keep them at four lines.
3. Generate `ai-integrations.lock.json` (`node scripts/verify-upstream.ts --write`).
4. Run `pnpm check`, then `pnpm run check:catalog -- --live` to verify discovery.

Capture a sanitised catalog into `packages/provider/fixtures/catalog.json` for
offline checks. Every measured effort needs a line in the evidence docs.

## Quota

T3 Code can read subscription or credit usage over its HTTP quota source. A pack
opts in by implementing `hooks.quota`:

```ts
quota: (context) => readVendorQuota(context), // Promise<HttpQuotaAccount[]>
```

Return one `HttpQuotaAccount` per upstream account. Each window needs an `id`,
a `kind` (`session`, `weekly`, `monthly`, `other`), a `label` and a
`usedPercent`. Facts the vendor publishes stay facts: **never invent a
percentage**, and leave a window out when the vendor does not report it.

Two contract helpers keep packs consistent:

- `parseQuotaResetAt(value)` turns epoch seconds, epoch milliseconds, numeric
  strings and ISO strings into one ISO timestamp, or `undefined`.
- `quotaWindowLabel("Session", "CommandCode", detail?)` renders
  `Session · CommandCode`. T3 shows only `window.label` in its per-thread Limits
  row, so the label must name the provider; add `detail` only to tell accounts
  of one product apart.

**Report `used` and `limit` when the vendor gives you absolute amounts**, because
a percentage-only source can only be aggregated approximately. When several
accounts belong to one product, run the result through `aggregateQuotaAccounts`
from the catalog: it pools by the account label's provider portion, weights
absolute amounts exactly, averages percentages only as a fallback, and strips
`used`/`limit` before the response is served.

Try it with a live key:

```sh
task quota                  # print the JSON T3 would receive
pnpm quota -- --serve       # serve GET /quota (and /health) for T3
```
