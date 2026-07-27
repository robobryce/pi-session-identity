import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import sessionIdentity, { SESSION_DIR_ENV, SESSION_FILE_ENV } from "../src/index.ts";

type SessionContext = {
	sessionManager: {
		getSessionFile(): string | undefined;
		getSessionDir(): string;
	};
};

type Handler = (event: { type: string }, ctx: SessionContext) => void;

function createHarness() {
	const handlers = new Map<string, Handler>();
	const pi = {
		on(name: string, handler: Handler): void {
			handlers.set(name, handler);
		},
	};
	sessionIdentity(pi as never);

	return {
		eventNames: [...handlers.keys()],
		emit(name: string, ctx: SessionContext): void {
			const handler = handlers.get(name);
			assert.ok(handler, `No handler registered for ${name}`);
			handler({ type: name }, ctx);
		},
	};
}

function context(sessionFile: string | undefined, sessionDir: string): SessionContext {
	return {
		sessionManager: {
			getSessionFile: () => sessionFile,
			getSessionDir: () => sessionDir,
		},
	};
}

function withRestoredEnvironment(run: () => void): void {
	const saved = {
		[SESSION_FILE_ENV]: process.env[SESSION_FILE_ENV],
		[SESSION_DIR_ENV]: process.env[SESSION_DIR_ENV],
	};
	delete process.env[SESSION_FILE_ENV];
	delete process.env[SESSION_DIR_ENV];
	try {
		run();
	} finally {
		for (const [name, value] of Object.entries(saved)) {
			if (value === undefined) delete process.env[name];
			else process.env[name] = value;
		}
	}
}

test("publishes Pi's exact session file and directory", () => {
	withRestoredEnvironment(() => {
		const harness = createHarness();
		assert.deepEqual(harness.eventNames, ["session_start", "session_shutdown"]);

		const sessionFile = "/tmp/pi sessions/current session.jsonl";
		const sessionDir = "/tmp/pi sessions";
		harness.emit("session_start", context(sessionFile, sessionDir));

		assert.equal(process.env[SESSION_FILE_ENV], sessionFile);
		assert.equal(process.env[SESSION_DIR_ENV], sessionDir);
	});
});

test("refreshes identity across sessions and clears it for an ephemeral session", () => {
	withRestoredEnvironment(() => {
		const harness = createHarness();
		harness.emit("session_start", context("/sessions/one.jsonl", "/sessions"));
		harness.emit("session_start", context("/other/two.jsonl", "/other"));

		assert.equal(process.env[SESSION_FILE_ENV], "/other/two.jsonl");
		assert.equal(process.env[SESSION_DIR_ENV], "/other");

		harness.emit("session_start", context(undefined, "/unused"));
		assert.equal(process.env[SESSION_FILE_ENV], undefined);
		assert.equal(process.env[SESSION_DIR_ENV], undefined);
	});
});

test("removes owned identity on shutdown", () => {
	withRestoredEnvironment(() => {
		const harness = createHarness();
		harness.emit("session_start", context("/sessions/current.jsonl", "/sessions"));
		harness.emit("session_shutdown", context("/sessions/current.jsonl", "/sessions"));

		assert.equal(process.env[SESSION_FILE_ENV], undefined);
		assert.equal(process.env[SESSION_DIR_ENV], undefined);
	});
});

test("does not delete environment values changed by another owner", () => {
	withRestoredEnvironment(() => {
		const harness = createHarness();
		harness.emit("session_start", context("/sessions/current.jsonl", "/sessions"));
		process.env[SESSION_FILE_ENV] = "/external/session.jsonl";
		process.env[SESSION_DIR_ENV] = "/external";

		harness.emit("session_shutdown", context("/sessions/current.jsonl", "/sessions"));
		assert.equal(process.env[SESSION_FILE_ENV], "/external/session.jsonl");
		assert.equal(process.env[SESSION_DIR_ENV], "/external");
	});
});

test("leaves unowned environment values alone for an ephemeral session", () => {
	withRestoredEnvironment(() => {
		process.env[SESSION_FILE_ENV] = "/external/session.jsonl";
		process.env[SESSION_DIR_ENV] = "/external";
		const harness = createHarness();

		harness.emit("session_start", context(undefined, "/unused"));
		assert.equal(process.env[SESSION_FILE_ENV], "/external/session.jsonl");
		assert.equal(process.env[SESSION_DIR_ENV], "/external");
	});
});

test("package metadata points Pi at the shipped extension", () => {
	const manifest = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
	assert.deepEqual(manifest.pi.extensions, ["./src/index.ts"]);
	assert.ok(manifest.files.includes("src"));
	assert.equal(manifest.dependencies, undefined);
});
