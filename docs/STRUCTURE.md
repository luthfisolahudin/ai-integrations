# Structure

The upstream workspace enforces the import boundaries in [the boundary checker](../packages/cli/src/lib/boundaries.ts). The contract and catalog packages plus both adapter factories ship together in the downstream `engine/` directory.

| Owner | Paths |
|---|---|
| Policy | `packages/contract` |
| Discovery and snapshot I/O | `packages/catalog` |
| Host SDK wiring | `adapters/pi`, `adapters/opencode` |
| Fixture-based upstream checks | `packages/conformance`, `packages/provider`, `examples` |
| Starter and engine updater | `scripts/provider-engine.ts` |

See [the runtime flow](DESIGN.md) and [the downstream update procedure](SYNC.md).
