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
const model = "fixture-free";
const reply = "FIXTURE_CHAT_OK";
let catalogStatus = 200;
let chats = 0;

const server = createServer(async (request, response) => {
	const json = (status: number, body: unknown) => {
		response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
	};
	try {
		if (request.headers.authorization !== `Bearer ${packKey}`) return json(401, { error: "fixture authentication failed" });
		if (request.method === "GET" && request.url === "/models") {
			return json(catalogStatus, { data: [{ id: model }] });
		}
		if (request.method !== "POST" || request.url !== "/chat/completions") return json(404, { error: "unexpected route" });

		const chunks: Buffer[] = [];
		for await (const chunk of request) chunks.push(chunk);
		const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
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
	for (const path of ["packages/contract/src", "packages/catalog/src", "adapters/pi/src", "adapters/opencode/src"]) {
		const output = join(source, path);
		mkdirSync(dirname(output), { recursive: true });
		cpSync(new URL(`../${path}`, import.meta.url), output, { recursive: true });
	}
	cpSync(new URL("../LICENSE", import.meta.url), join(source, "LICENSE"));
	tagRelease("v2.0.0");
	const generator = new URL("./provider-engine.ts", import.meta.url);
	await execute(process.execPath, [fileURLToPath(generator), "init", "--source", source, "--tag", "v2.0.0",
		"--dest", consumer, "--id", "fixture", "--name", "Fixture", "--base-url", `http://127.0.0.1:${address.port}`,
		"--api-key-env", "FIXTURE_API_KEY"], { timeout: 90_000 });
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
	catalogStatus = 503;
	await assert.rejects(run(process.execPath, ["check-catalog.ts", "--live"]), { code: 1 });

	const packBody = readFileSync(pack, "utf8") + "\n// Provider-owned edit.\n";
	writeFileSync(pack, packBody);
	const check = (tag: string) => run(process.execPath, ["scripts/engine.ts", "update", "--source", source, "--tag", tag]);
	const state = () => JSON.parse(readFileSync(join(consumer, "engine.lock.json"), "utf8")) as { tag: string; digest: string };
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

	console.log("Generated checkout, native Pi and OpenCode chat, live failure, update, and rollback passed.");
} finally {
	server.closeAllConnections();
	server.close();
	rmSync(temporary, { recursive: true, force: true });
}
