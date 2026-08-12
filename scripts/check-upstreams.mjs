#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
	componentById,
	readUpstreamLock,
	repositoryRoot,
	sha256File,
	validateUpstreamLock,
} from "./upstream-lock.mjs";

const lock = readUpstreamLock();
const failures = validateUpstreamLock(lock);
const bundledRoot = resolve(repositoryRoot, "packages/coding-agent/bundled");

const actualDirectories = readdirSync(bundledRoot, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.sort();
const expectedDirectories = [...lock.runtime.bundle_directories].sort();
if (JSON.stringify(actualDirectories) !== JSON.stringify(expectedDirectories)) {
	failures.push(`runtime bundle directories differ: ${actualDirectories.join(", ")}`);
}

for (const extension of lock.runtime.extensions) {
	const path = resolve(bundledRoot, ...extension.relative_path);
	if (!existsSync(path)) failures.push(`${extension.name}: runtime entry is missing at ${extension.relative_path.join("/")}`);
}
for (const skillPath of lock.runtime.skill_directories) {
	if (!existsSync(resolve(bundledRoot, ...skillPath))) failures.push(`runtime skill directory is missing: ${skillPath.join("/")}`);
}

const btw = componentById(lock, "btw");
const btwPath = resolve(bundledRoot, "btw-23017e9", "index.ts");
if (btw?.active?.source_sha256 && sha256File(btwPath) !== btw.active.source_sha256) {
	failures.push("BTW source SHA-256 differs from the upstream lock");
}

const docs = readFileSync(resolve(repositoryRoot, "docs/bundled-sources.json"));
const packaged = readFileSync(resolve(repositoryRoot, "packages/coding-agent/BUNDLED_SOURCES.json"));
if (!docs.equals(packaged)) failures.push("packaged and documentation bundle inventories differ");

if (failures.length > 0) {
	console.error(`Upstream source check failed:\n- ${[...new Set(failures)].join("\n- ")}`);
	process.exit(1);
}
console.log(
	`Upstream source check passed for ${lock.components.length} component records and ${lock.runtime.extensions.length} runtime extensions.`,
);
