import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ToolApprovalRequest } from "../src/core/tool-authorization.ts";
import { loadToolPolicy } from "../src/core/tool-policy.ts";

const cleanup: string[] = [];

function makeFixture(argumentsValue: unknown = { command: "printf safe" }) {
	const root = mkdtempSync(join(tmpdir(), "adrouter-tool-policy-"));
	cleanup.push(root);
	const workspace = join(root, "workspace");
	mkdirSync(workspace, { mode: 0o700 });
	const policyPath = join(root, "policy.json");
	writeFileSync(
		policyPath,
		JSON.stringify({ version: 1, rules: [{ tool: "bash", cwd: workspace, arguments: argumentsValue }] }),
		{ mode: 0o600 },
	);
	chmodSync(policyPath, 0o600);
	return { root, workspace, policyPath };
}

function request(cwd: string, argumentsValue: unknown): ToolApprovalRequest {
	return {
		version: 1,
		approvalId: "approval",
		digest: "sha256:test",
		sessionId: "session",
		toolCallId: "call",
		toolName: "bash",
		effect: "command",
		cwd,
		arguments: argumentsValue,
	};
}

afterEach(() => {
	for (const path of cleanup.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe("loadToolPolicy", () => {
	it.skipIf(process.platform === "win32")(
		"allows one exact canonical argument match and then consumes the rule",
		async () => {
			const fixture = makeFixture({ z: 2, a: 1 });
			const authorize = loadToolPolicy(fixture.policyPath, fixture.workspace);

			await expect(authorize(request(fixture.workspace, { a: 1, z: 2 }))).resolves.toEqual({ allow: true });
			await expect(authorize(request(fixture.workspace, { z: 2, a: 1 }))).resolves.toMatchObject({ allow: false });
		},
	);

	it.skipIf(process.platform === "win32")("denies changed arguments", async () => {
		const fixture = makeFixture();
		const authorize = loadToolPolicy(fixture.policyPath, fixture.workspace);

		await expect(authorize(request(fixture.workspace, { command: "printf unsafe" }))).resolves.toMatchObject({
			allow: false,
		});
	});

	it.skipIf(process.platform === "win32")("rejects group-readable and workspace-local policy files", () => {
		const fixture = makeFixture();
		chmodSync(fixture.policyPath, 0o640);
		expect(() => loadToolPolicy(fixture.policyPath, fixture.workspace)).toThrow(/permissions/);

		const insidePath = join(fixture.workspace, "policy.json");
		writeFileSync(insidePath, JSON.stringify({ version: 1, rules: [] }), { mode: 0o600 });
		expect(() => loadToolPolicy(insidePath, fixture.workspace)).toThrow(/outside/);
	});
});
