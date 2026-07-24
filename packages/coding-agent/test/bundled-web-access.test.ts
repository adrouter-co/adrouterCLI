import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getWebSearchConfigPath } from "../bundled/pi-web-access-0.13.0/utils.ts";
import { DefaultResourceLoader } from "../src/core/resource-loader.ts";

const originalAgentDir = process.env.ADROUTER_CODING_AGENT_DIR;
const originalPiAgentDir = process.env.PI_CODING_AGENT_DIR;
const temporaryDirectories: string[] = [];

afterEach(() => {
	if (originalAgentDir === undefined) delete process.env.ADROUTER_CODING_AGENT_DIR;
	else process.env.ADROUTER_CODING_AGENT_DIR = originalAgentDir;
	if (originalPiAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
	else process.env.PI_CODING_AGENT_DIR = originalPiAgentDir;
	for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("bundled web access", () => {
	it("stores configuration beneath ADROUTER_CODING_AGENT_DIR", () => {
		process.env.ADROUTER_CODING_AGENT_DIR = join(tmpdir(), "adrouter-web-config-test");
		process.env.PI_CODING_AGENT_DIR = join(tmpdir(), "forbidden-pi-web-config-test");
		expect(getWebSearchConfigPath()).toBe(join(process.env.ADROUTER_CODING_AGENT_DIR, "web-search.json"));
		expect(getWebSearchConfigPath()).not.toContain(process.env.PI_CODING_AGENT_DIR);
	});

	it("executes the fetch tool validation path without credentials or network", async () => {
		const root = join(tmpdir(), `adrouter-web-tool-${process.pid}-${Math.random().toString(36).slice(2)}`);
		temporaryDirectories.push(root);
		const agentDir = join(root, "agent");
		const cwd = join(root, "project");
		mkdirSync(agentDir, { recursive: true });
		mkdirSync(cwd, { recursive: true });
		const loader = new DefaultResourceLoader({ cwd, agentDir, includeBundledFeatures: true });
		await loader.reload();
		const fetchTool = loader
			.getExtensions()
			.extensions.flatMap((extension) => [...extension.tools.values()])
			.find((tool) => tool.definition.name === "fetch_content");
		expect(fetchTool).toBeDefined();
		const result = await fetchTool!.definition.execute("test", {}, undefined, undefined, {} as never);
		expect(result.content).toEqual([{ type: "text", text: "Error: No URL provided." }]);
	});
});
