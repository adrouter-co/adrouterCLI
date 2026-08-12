#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import {
	componentById,
	readUpstreamLock,
	sha256File,
	sha512Integrity,
	validateUpstreamLock,
} from "./upstream-lock.mjs";

function option(name) {
	const index = process.argv.indexOf(name);
	return index === -1 ? undefined : process.argv[index + 1];
}

const componentId = option("--component");
const version = option("--version");
const validArgs = new Set(["--component", "--version"]);
for (let index = 2; index < process.argv.length; index += 2) {
	if (!validArgs.has(process.argv[index]) || process.argv[index + 1] === undefined) {
		console.error("Usage: node scripts/stage-upstream.mjs --component <id> --version <exact>");
		process.exit(2);
	}
}
if (!componentId || !version) {
	console.error("Usage: node scripts/stage-upstream.mjs --component <id> --version <exact>");
	process.exit(2);
}

const lock = readUpstreamLock();
const failures = validateUpstreamLock(lock);
if (failures.length > 0) throw new Error(`Invalid upstream lock: ${failures.join("; ")}`);
const component = componentById(lock, componentId);
if (!component) throw new Error(`Unknown upstream component: ${componentId}`);
if (!component.target || component.target.version !== version) {
	throw new Error(`${componentId} is frozen at ${component.target?.version ?? "no target"}; refusing ${version}`);
}

const dirty = execFileSync("git", ["status", "--porcelain", "--untracked-files=normal"], { encoding: "utf8" }).trim();
if (dirty) throw new Error("Upstream staging requires a clean working tree");

const url = component.target.source_url;
const response = await fetch(url, {
	headers: { accept: "application/octet-stream", "user-agent": "AdRouterCLI upstream staging" },
	signal: AbortSignal.timeout(60_000),
});
if (!response.ok) throw new Error(`${componentId}: source returned HTTP ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
const stagingRoot = mkdtempSync(join(tmpdir(), `adrouter-${componentId}-${version}-`));
const archivePath = join(stagingRoot, basename(new URL(url).pathname) || `${componentId}-${version}.tgz`);
writeFileSync(archivePath, bytes, { mode: 0o600 });

if (component.target.source_sha256 && sha256File(archivePath) !== component.target.source_sha256) {
	throw new Error(`${componentId}: source SHA-256 does not match upstreams.lock.json`);
}
if (component.target.npm_integrity && sha512Integrity(bytes) !== component.target.npm_integrity) {
	throw new Error(`${componentId}: npm integrity does not match upstreams.lock.json`);
}

const extracted = join(stagingRoot, "source");
mkdirSync(extracted, { recursive: true, mode: 0o700 });
execFileSync("tar", ["-xzf", archivePath, "-C", extracted]);
console.log(`Verified ${componentId}@${version}`);
console.log(`Archive: ${archivePath}`);
console.log(`Extracted source: ${extracted}`);
console.log("No repository files were changed.");
