# Structure

Focused packages; layers are derived from the package name and the file path in
[the boundary checker](../packages/dev/cli/src/commands/boundaries.ts).

| Owner | Paths |
|---|---|
| Policy | `packages/runtime/contract` |
| Discovery and snapshot I/O | `packages/runtime/catalog` |
| Reusable host factories | `packages/runtime/pi`, `packages/runtime/opencode` |
| Commands and tests (dev) | `packages/dev/cli`, `packages/dev/conformance` |
| Vendor data and fixtures | `packages/provider` |
| Host wiring (thin, per vendor) | `adapters/pi`, `adapters/opencode` |
| Example packs (template only) | `examples` |

## Naming

`@luthfisolahudin/<project>-integrations-<role>` — the head token is the owner
project, the tail is the role. `ai-integrations-pi` is the factory;
`9router-integrations-pi` is that checkout's wiring.

## The #provider alias

A package that needs the vendor imports `#provider`. Each consumer package maps
it to `src/provider.ts`, a one-line re-export of
`../../../provider/src/index.ts` — the layout depth (`packages/<marker>/<pkg>`)
is the same in every checkout, so the shim is identical everywhere. Only cli and
conformance declare the alias; a factory importing it fails to resolve.

## Copy-in surface

`packages/runtime/**` and `packages/dev/**` are what a downstream checkout copies
from a tagged release (see [SYNC](SYNC.md)). Everything else is owned by the
checkout. `examples/corpus.test.ts` is template-only because it needs the tier
packs a downstream repo deletes.

See [the runtime flow](DESIGN.md) and [the downstream update procedure](SYNC.md).
