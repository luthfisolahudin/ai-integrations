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
