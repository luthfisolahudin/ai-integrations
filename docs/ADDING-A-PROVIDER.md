# Add a provider

Run the generator from the upstream checkout, with Node and pnpm available. Choose a tag that contains the copy-in engine.

```sh
node scripts/provider-engine.ts init --tag <version> --dest ../acme-integrations --id acme --name "Acme AI" --base-url https://api.acme.test/v1 --api-key-env ACME_API_KEY
```

The destination must be a new directory. Supply the credential as an environment variable. Omit `--api-key-env` for a keyless endpoint.

In the generated checkout:

1. Run `pnpm install --frozen-lockfile`.
2. Configure field aliases, filters, and verified overrides in `provider.ts`.
3. Capture a sanitized payload in `fixtures/catalog.json` and run `pnpm check` and `pnpm run check:catalog`.
4. Run `pnpm run check:catalog --live`. Confirm its models in [both installed hosts](INSTALL.md).

Keep provider facts in the generated repo. [Adoption and subsequent updates](SYNC.md)
