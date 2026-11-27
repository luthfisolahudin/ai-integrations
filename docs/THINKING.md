# Thinking formats and measured effort

Two separate questions, deliberately not merged:

1. **Format** — how does this provider spell "turn thinking on"? Declared in its
   catalog, mapped by `packages/contract/src/thinking.ts`.
2. **Effort** — which value actually buys more thinking on this exact route?
   Measured per model, never inferred.

## Format mapping

| Declared | Pi equivalent | Status |
|---|---|---|
| `openai` | `openai` | mapped |
| `deepseek` | `deepseek` | mapped |
| `qwen` | `qwen` | mapped |
| `zai` | `zai` | mapped |
| `kimi`, `gemini-level`, `minimax`, `step` | — | **unmapped** |

For Chat Completions, an unmapped format leaves the effort menu empty. Adding an
override such as `{ kimi: "openai" }` requires a measurement entry.

## Effort sources

| Source | Meaning | Provenance |
|---|---|---|
| Measured value | A probe compared levels on this route | `measured` |
| Provider catalog | The provider declares its accepted values | `catalog` |
| Pack `curated` | A vendor document states them where the catalog is silent | `curated` |
| models.dev | Optional enrichment for catalog reports only | `models.dev` |

A measured value takes precedence over a declared value, and a declared value over
a curated one. The native adapters expose levels for a supported wire format.

**models.dev never decides a menu.** Its `reasoning_options` are voted across every
gateway that publishes a model id, so they describe *those* routes. A reseller can
publish a five-level ladder for a model whose lab only offers on/off, and a vote
majority then ships a menu this route cannot honour. The index still fills limits,
cost, and modality gaps; `declaredEfforts` reads the catalog and `curated` only.
`readCachedModelIndex` is the runtime path, and it exists only after a CLI run has
written it, so a hint-derived menu would also differ between machines.

An enum that contains `none`/`off` is an off switch: `canDisable` is inferred from
it, because a menu with no off entry cannot express what the provider accepts.

## Effort evidence

`packages/provider/src/effort.ts` holds only measured values, and every entry has
a line here with the date, the command, and the observed signal.

Format:

```
- YYYY-MM-DD `<provider>/<model>`: verdict `<verdict>`, wire `<value>`, signals {"low": 10, "max": 90}, noise floor 9.
```

## Verdicts

| Verdict | Meaning | Action |
|---|---|---|
| `mapped` | the highest level produced the largest signal | add the entry |
| `no-observable-difference` | signals within the noise floor | ship **no** menu |
| `inverted` | a lower level produced more thinking | map the level that buys depth, note the inversion |
| `unsupported` | every level rejected with 400/422 | no menu; record the rejection |
| `inconclusive` | a level failed for another reason (402, 429, 5xx, auth), or fewer than two levels were accepted | fix the account/quota and re-run; **never** record a verdict |

The noise floor defaults to `max(2, 10% of the largest signal)`. Reasoning-token
counts move by a few tokens on unrelated request noise, so an unbounded
comparison would "discover" a mapping in a 10-vs-11 sample.

## Client `max`

Pi's `max` level means "the highest effort this route actually applies", not a
promise to transmit the literal string `max`. That is why `effortMenu()` maps
only the highest level by default and hides the rest.

## Measured here

Nothing yet. This section fills up as providers are measured; see
`docs/EVIDENCE.md` for the log.
