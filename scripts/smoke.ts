import assert from "node:assert/strict";
import { execFile, execFileSync, execSync } from "node:child_process";
import { once } from "node:events";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const temporary = mkdtempSync(join(tmpdir(), "provider-engine-smoke-"));
const source = join(temporary, "source");
const consumer = join(temporary, "consumer");
const pack = join(consumer, "provider.ts");
const packKey = "fixture-key";
const apiPath = "/provider/v1";
const model = "fixture-free";
const reply = "FIXTURE_CHAT_OK";
const messagesModel = "fixture-messages";
let catalogStatus = 200;
let catalogEmpty = false;
let chats = 0;
let messages = 0;

const server = createServer(async (request, response) => {
	const json = (status: number, body: unknown) => {
		response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
	};
	try {
		const pathname = new URL(request.url ?? "/", "http://fixture.local").pathname;
		if (request.headers.authorization !== `Bearer ${packKey}` && request.headers["x-api-key"] !== packKey) return json(401, { error: "fixture authentication failed" });
		if (request.method === "GET" && pathname === apiPath + "/models") {
			return json(catalogStatus, { data: catalogEmpty ? [] : [{ id: model }, { id: messagesModel, api: "anthropic-messages" }] });
		}
		if (request.method !== "POST" || ![apiPath + "/chat/completions", apiPath + "/messages"].includes(pathname)) return json(404, { error: "unexpected route: " + pathname });

		const chunks: Buffer[] = [];
		for await (const chunk of request) chunks.push(chunk);
		const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
		if (pathname === apiPath + "/messages") {
			assert.equal(body.model, messagesModel);
			assert.equal(body.stream, true);
			messages++;
			response.writeHead(200, { "content-type": "text/event-stream" });
			const events = [
				{ type: "message_start", message: { id: "msg-fixture", type: "message", role: "assistant", model: messagesModel,
					content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 0 } } },
				{ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
				{ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: reply } },
				{ type: "content_block_stop", index: 0 },
				{ type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 1 } },
				{ type: "message_stop" },
			];
			for (const event of events) response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
			return response.end();
		}
		assert.equal(body.model, model);
		assert.equal(body.stream, true);
		chats++;

		response.writeHead(200, { "content-type": "text/event-stream" });
		const base = { id: "chatcmpl-fixture", object: "chat.completion.chunk", created: 1, model };
		response.write(`data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta: { role: "assistant", content: reply }, finish_reason: null }] })}\n\n`);
		response.write(`data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`);
		response.end("data: [DONE]\n\n");
	} catch (error) {
		if (response.headersSent) response.end();
		else json(400, { error: error instanceof Error ? error.message : String(error) });
	}
});

function git(...args: string[]) {
	execFileSync("git", ["-C", source, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", ...args], { stdio: "inherit" });
}

function tagRelease(tag: string) {
	git("add", ".");
	git("commit", "--quiet", "-m", `Fixture ${tag}`);
	git("tag", tag);
}

try {
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	const address = server.address();
	assert.ok(address !== null && typeof address !== "string");

	mkdirSync(source);
	git("init", "--quiet");
	// Mirror every tree the release owns, including the managed ones, so the smoke
	// fixture exercises the same copy the real generator does.
	for (const path of [
		"packages/contract/src", "packages/catalog/src", "adapters/pi/src", "adapters/opencode/src",
		"packages/contract/test", "packages/catalog/test", "packages/cli/src", "packages/cli/test", "packages/conformance/test",
	]) {
		const output = join(source, path);
		mkdirSync(dirname(output), { recursive: true });
		cpSync(new URL(`../${path}`, import.meta.url), output, { recursive: true });
	}
	cpSync(new URL("../LICENSE", import.meta.url), join(source, "LICENSE"));
	tagRelease("v2.0.0");
	const generator = new URL("./provider-engine.ts", import.meta.url);
	await execute(process.execPath, [fileURLToPath(generator), "init", "--source", source, "--tag", "v2.0.0",
		"--dest", consumer, "--id", "fixture", "--name", "Fixture", "--base-url", `http://127.0.0.1:${address.port}${apiPath}`,
		"--api-key-env", "FIXTURE_API_KEY"], { timeout: 90_000 });
	const generated = readFileSync(pack, "utf8");
	writeFileSync(pack, generated.replace('"path": "/models"\n  }', [
		'"path": "/models"',
		'  },',
		'  hooks: { normalize: (row) => typeof row.api === "string" ? { api: row.api } : {} }',
	].join("\n")));
	execSync("pnpm install --frozen-lockfile", { cwd: consumer, stdio: "inherit", timeout: 90_000 });
	execSync("pnpm check", { cwd: consumer, stdio: "inherit", timeout: 30_000 });

	const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/API_KEY|OPENCODE_CONFIG|PI_CODING_AGENT_DIR/.test(key)));
	const config = join(temporary, "opencode.json");
	writeFileSync(config, JSON.stringify({ plugins: [pathToFileURL(consumer).href] }));
	Object.assign(env, {
		FIXTURE_API_KEY: packKey,
		OPENCODE_CONFIG: config,
		PI_CODING_AGENT_DIR: join(temporary, "pi"),
		XAI_CACHE_DIR: join(temporary, "catalog"),
		XDG_CACHE_HOME: join(temporary, "cache"),
		XDG_CONFIG_HOME: join(temporary, "config"),
		XDG_DATA_HOME: join(temporary, "data"),
		XDG_STATE_HOME: join(temporary, "state"),
	});
	const catalogDirectory = join(env.XAI_CACHE_DIR!, "ai-provider-integrations");
	mkdirSync(catalogDirectory, { recursive: true });
	writeFileSync(join(catalogDirectory, "models.dev.json"), JSON.stringify({
		checkedAt: Date.now(),
		catalog: { fixture: { models: { [model]: { limit: { context: 96_000, output: 8_000 } } } } },
	}));
	function run(command: string, args: string[]) {
		const result = execute(command, args, { cwd: consumer, env, timeout: 60_000 });
		result.child.stdin?.end();
		return result;
	}
	const openCode = process.env.OPENCODE_BIN ?? "opencode";
	const pi = join(consumer, "node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js");
	const id = `fixture/${model}`;
	assert.match((await run(openCode, ["models", "--standalone"])).stdout, new RegExp(id));
	assert.match((await run(process.execPath, [pi, "--no-extensions", "-e", join(consumer, "pi.ts"), "--no-session",
		"--provider", "fixture", "--model", model, "-p", "Reply with OK."])).stdout, new RegExp(reply));
	assert.match((await run(openCode, ["run", "--standalone", "--archived", "--model", id, "Reply with OK."])).stdout, new RegExp(reply));
	assert.ok(chats >= 2);
	assert.match((await run(process.execPath, [pi, "--no-extensions", "-e", join(consumer, "pi.ts"), "--no-session",
		"--provider", "fixture", "--model", messagesModel, "-p", "Reply with OK."])).stdout, new RegExp(reply));
	assert.match((await run(openCode, ["run", "--standalone", "--archived", "--model", `fixture/${messagesModel}`, "Reply with OK."])).stdout, new RegExp(reply));
	assert.ok(messages >= 2);
	const refresh = () => run(process.execPath, ["--input-type=module", "-e", [
		'import { createCatalogRuntime } from "./engine/catalog/runtime.ts";',
		'import { pack } from "./provider.ts";',
		'const result = await createCatalogRuntime(pack).refresh({}, { force: true });',
		'console.log(JSON.stringify({ source: result.source, ids: result.models.map((model) => model.id), limits: result.models.map((model) => model.contextWindow) }));',
	].join("\n")]);
	catalogStatus = 503;
	const stale = await refresh();
	assert.deepEqual(JSON.parse(stale.stdout), { source: "snapshot", ids: [model, messagesModel], limits: [96_000, 128_000] });
	assert.match(stale.stderr, /using snapshot:.*HTTP 503/);
	assert.match((await run(openCode, ["models", "--standalone"])).stdout, new RegExp(id));
	await assert.rejects(run(process.execPath, ["check-catalog.ts", "--live"]), { code: 1 });
	catalogStatus = 200;
	catalogEmpty = true;
	assert.deepEqual(JSON.parse((await refresh()).stdout), { source: "network", ids: [], limits: [] });
	assert.doesNotMatch((await run(openCode, ["models", "--standalone"])).stdout, new RegExp(id));
	assert.doesNotMatch((await run(process.execPath, [pi, "--no-extensions", "-e", join(consumer, "pi.ts"), "--list-models"])).stdout, new RegExp(model));

	const packBody = readFileSync(pack, "utf8") + "\n// Provider-owned edit.\n";
	writeFileSync(pack, packBody);
	const check = (tag: string) => run(process.execPath, ["scripts/engine.ts", "update", "--source", source, "--tag", tag]);
	const state = () => JSON.parse(readFileSync(join(consumer, "engine.lock.json"), "utf8")) as { tag: string; files: Record<string, string> };
	const original = state();
	const contract = join(source, "packages/contract/src/pack.ts");
	const contractBody = readFileSync(contract, "utf8");
	writeFileSync(contract, contractBody + "\n// Compatible release.\n");
	tagRelease("v2.0.1");
	await check("v2.0.1");
	assert.equal(state().tag, "v2.0.1");
	assert.equal(readFileSync(pack, "utf8"), packBody);
	writeFileSync(contract, contractBody + '\nconst incompatible: never = 1;\n');
	tagRelease("v2.0.2");
	await assert.rejects(check("v2.0.2"));
	assert.equal(state().tag, "v2.0.1");
	await check("v2.0.0");
	assert.deepEqual(state(), original);
	assert.equal(readFileSync(pack, "utf8"), packBody);

	// A lock written before the file manifest has no `files`; the first update out
	// of one must still adopt the new format rather than failing to verify.
	const legacy = JSON.parse(readFileSync(join(consumer, "engine.lock.json"), "utf8")) as { tag: string; files: Record<string, string> };
	writeFileSync(join(consumer, "engine.lock.json"), JSON.stringify({ tag: legacy.tag ?? "v2.0.0", commit: "legacy", packSchemaVersion: 1, digest: "stale" }, null, 2));
	await check("v2.0.1");
	assert.equal(state().tag, "v2.0.1");
	assert.ok(Object.keys(state().files).length > 0, "the adopted lock carries a file manifest");
	await check("v2.0.0");
	assert.deepEqual(state(), original);

	console.log("Generated checkout, native Pi and OpenCode routes, empty catalogs, stale snapshots, live failure, update, rollback, and legacy-lock adoption passed.");
} finally {
	server.closeAllConnections();
	server.close();
	rmSync(temporary, { recursive: true, force: true });
}
