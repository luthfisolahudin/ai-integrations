# ai-integrations

Shared runtime, adapters and tooling for AI provider integrations with live
model discovery for Pi and OpenCode. A downstream checkout copies
`packages/runtime` and `packages/dev` from a tagged release and owns one vendor
package; `packages/runtime/pi` and `packages/runtime/opencode` are the reusable
host factories, `adapters/*` are thin per-vendor wiring.

- [Create or adopt a provider](docs/ADDING-A-PROVIDER.md)
- [Install in Pi and OpenCode](docs/INSTALL.md)
- [Update or roll back the engine](docs/SYNC.md)
- [Runtime design and acceptance criteria](docs/DESIGN.md)

To work on the upstream engine, run `pnpm install --frozen-lockfile` and `pnpm check` with the versions in [.node-version](.node-version) and [package.json](package.json).

