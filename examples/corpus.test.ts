import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

// Template-only corpus: it covers the example provider plus both tier packs, which
// a downstream checkout does not ship. Relative imports keep this file runnable
// from the repo root without depending on workspace package names.
import { buildModels } from "../packages/runtime/catalog/src/index.ts";
import { PACK_SCHEMA_VERSION, type Pack, type RawRecord } from "../packages/runtime/contract/src/index.ts";
import { toOpencodeModels } from "../packages/runtime/opencode/src/model.ts";
import { toPiModels } from "../packages/runtime/pi/src/model.ts";
import { packs as provider } from "../packages/provider/src/index.ts";
import { packs as tierB } from "./tier-b/src/index.ts";
import { packs as tierC } from "./tier-c/src/index.ts";

const ROOT = join(import.meta.dirname, "..");

interface CorpusEntry {
	pack: Pack;
	fixture: string;
}

const CORPUS: CorpusEntry[] = [
	{ pack: provider[0]!, fixture: "packages/provider/fixtures/catalog.json" },
	{ pack: tierB[0]!, fixture: "examples/tier-b/fixtures/catalog.json" },
	{ pack: tierC[0]!, fixture: "examples/tier-c/fixtures/catalog.json" },
];

function records(path: string): RawRecord[] {
	const payload = JSON.parse(readFileSync(join(ROOT, path), "utf8")) as { data?: RawRecord[] };
	assert.ok(Array.isArray(payload.data), `${path} has no data[]`);
	return payload.data;
}

test("the corpus covers all three catalog qualities", () => {
	assert.equal(CORPUS.length, 3);
	assert.equal(new Set(CORPUS.map((entry) => entry.pack.id)).size, 3);
});

test("every corpus pack validates and matches the current schema", () => {
	for (const entry of CORPUS) {
		assert.equal(entry.pack.schemaVersion, PACK_SCHEMA_VERSION, entry.pack.id);
		assert.match(entry.pack.baseUrl, /^https:\/\//, entry.pack.id);
	}
});

for (const entry of CORPUS) {
	test(`${entry.pack.id}: projects through both hosts`, () => {
		const models = buildModels(entry.pack, records(entry.fixture), { measuredIds: new Set() });
		assert.ok(models.length > 0);
		const host = { providerId: entry.pack.id, baseUrl: entry.pack.baseUrl };
		const pi = toPiModels(models, {}, host);
		const opencode = toOpencodeModels(models, {});
		const expected = models
			.filter((model) => model.excluded === undefined)
			.map((model) => model.id)
			.sort();
		assert.deepEqual(pi.map((model) => model.id).sort(), expected);
		assert.deepEqual(opencode.map((model) => model.id).sort(), expected);
	});
}
