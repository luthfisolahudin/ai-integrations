# Structure

The upstream workspace enforces the import boundaries in [the boundary checker](../packages/cli/src/lib/boundaries.ts). Layers are derived from the package suffix, so `contract`, `catalog`, `provider`, `pi`, `opencode`, `cli`, and `conformance` resolve the same way in every checkout; `tier-*` names an example pack.

| Owner | Paths |
|---|---|
| Policy | `packages/contract` |
| Discovery and snapshot I/O | `packages/catalog` |
| Host SDK wiring | `adapters/pi`, `adapters/opencode` |
| Fixture-based upstream checks | `packages/conformance`, `packages/provider`, `examples` |
| Starter and engine updater | `scripts/provider-engine.ts` |

## What a release owns

`engine.lock.json` is a per-file sha256 manifest, not one directory digest. A
downstream checkout pins these trees:

| Tree | In `engine/`? | Rationale |
|---|---|---|
| `packages/contract/src`, `packages/catalog/src` | yes | the runtime the adapters call |
| `adapters/*/src` (minus `index.ts`) | yes | host wiring |
| `packages/cli/src`, `packages/cli/test` | no | commands and their tests, generic across providers |
| `packages/contract/test`, `packages/catalog/test` | no | the engine's own tests |
| `packages/conformance/test` | no | generic, minus `corpus.test.ts` |

`packages/provider` is never in the lock: it is the one package a checkout owns.
`corpus.test.ts` stays upstream because it imports the example packs a downstream
repo deletes.

See [the runtime flow](DESIGN.md) and [the downstream update procedure](SYNC.md).
