# AI provider integrations

Create a provider checkout that discovers its model inventory for Pi and OpenCode. Each provider owns its pack and pins a copy of the same tagged engine.

- [Create or adopt a provider](docs/ADDING-A-PROVIDER.md)
- [Install in Pi and OpenCode](docs/INSTALL.md)
- [Update or roll back the engine](docs/SYNC.md)
- [Runtime design and acceptance criteria](docs/DESIGN.md)

To work on the upstream engine, run `pnpm install --frozen-lockfile` and `pnpm check` with the versions in [.node-version](.node-version) and [package.json](package.json).

Run `pnpm run smoke` with OpenCode on PATH to test a generated checkout, both native hosts, and engine rollback.
