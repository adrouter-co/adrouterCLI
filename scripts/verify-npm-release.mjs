#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const packages = ["@adrouter/ai", "@adrouter/tui", "@adrouter/agent-core", "@adrouter/cli"];
const version = JSON.parse(readFileSync("package.json", "utf8")).version;

for (const name of packages) {
	const result = spawnSync("npm", ["view", name, "dist-tags", "--json"], { encoding: "utf8" });
	if (result.status !== 0) throw new Error(`Could not read npm state for ${name}`);
	const tags = JSON.parse(result.stdout);
	if (tags.beta !== version) throw new Error(`${name} beta points to ${tags.beta ?? "nothing"}, expected ${version}`);
	if (tags.latest === version) throw new Error(`${name} prerelease must not be assigned to latest`);
}

console.log(`All four npm packages resolve to ${version} under beta.`);
