#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	generatedBundledSourcesText,
	generatedRuntimeModuleText,
	readUpstreamLock,
	repositoryRoot,
	validateUpstreamLock,
} from "./upstream-lock.mjs";

const check = process.argv.includes("--check");
const unknown = process.argv.slice(2).filter((argument) => argument !== "--check");
if (unknown.length > 0) {
	console.error("Usage: node scripts/generate-upstream-metadata.mjs [--check]");
	process.exit(2);
}

const lock = readUpstreamLock();
const failures = validateUpstreamLock(lock);
if (failures.length > 0) {
	console.error(`Invalid upstream lock:\n- ${failures.join("\n- ")}`);
	process.exit(1);
}

const outputs = new Map([
	["docs/bundled-sources.json", generatedBundledSourcesText(lock)],
	["packages/coding-agent/BUNDLED_SOURCES.json", generatedBundledSourcesText(lock)],
	["packages/coding-agent/src/core/bundled-manifest.generated.ts", generatedRuntimeModuleText(lock)],
]);

const drift = [];
for (const [relativePath, expected] of outputs) {
	const path = resolve(repositoryRoot, relativePath);
	if (check) {
		let actual = "";
		try {
			actual = readFileSync(path, "utf8");
		} catch {
			drift.push(`${relativePath}: missing`);
			continue;
		}
		if (actual !== expected) drift.push(`${relativePath}: generated content is stale`);
	} else {
		writeFileSync(path, expected, "utf8");
		console.log(`Updated ${relativePath}`);
	}
}

if (drift.length > 0) {
	console.error(`Upstream-generated metadata is stale:\n- ${drift.join("\n- ")}`);
	process.exit(1);
}
if (check) console.log("Upstream-generated metadata is current.");
