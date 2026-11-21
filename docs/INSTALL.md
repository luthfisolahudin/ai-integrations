# Install an integration

In the provider checkout, run `pnpm install --frozen-lockfile`. Configure the API key for the provider before starting the host. See [how to create a provider checkout](ADDING-A-PROVIDER.md).

## Pi

Add the absolute path to the provider's `pi.ts` in `settings.json`:

```json
{ "extensions": ["<absolute-checkout-path>/pi.ts"] }
```

Run `pi --list-models`. Pi may start from the provider's last known inventory. Use a host model refresh to fetch the live catalog.

## OpenCode

Add the provider checkout directory in `opencode.json`. Its manifest resolves the plugin entrypoint.

```json
{ "plugins": ["file://<absolute-checkout-path>"] }
```

Run `opencode models` and find the pack's provider ID.
