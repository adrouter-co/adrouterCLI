#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, normalize } from "node:path";

const targetVersion = JSON.parse(readFileSync("package.json", "utf8")).version;
const repositoryUrl = "git+https://github.com/adrouter/adrouterCLI.git";
const publicPackages = [
	{ directory: "packages/ai", name: "@adrouter/ai", dependencies: [] },
	{ directory: "packages/tui", name: "@adrouter/tui", dependencies: [] },
	{ directory: "packages/agent", name: "@adrouter/agent-core", dependencies: ["@adrouter/ai"] },
	{
		directory: "packages/coding-agent",
		name: "@adrouter/cli",
		dependencies: ["@adrouter/agent-core", "@adrouter/ai", "@adrouter/tui"],
	},
];
const metadataOnly = process.argv.includes("--metadata-only");
const unknownArgs = process.argv.slice(2).filter((argument) => argument !== "--metadata-only");

if (unknownArgs.length > 0) {
	console.error("Usage: node scripts/check-beta-release-readiness.mjs [--metadata-only]");
	process.exit(2);
}

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

const failures = [];

for (const descriptor of publicPackages) {
	const manifest = readJson(join(descriptor.directory, "package.json"));
	if (manifest.name !== descriptor.name) failures.push(`${descriptor.directory}: expected package name ${descriptor.name}`);
	if (manifest.version !== targetVersion) failures.push(`${descriptor.name}: expected version ${targetVersion}`);
	if (manifest.private === true) failures.push(`${descriptor.name}: public package must not be private`);
	if (manifest.repository?.url !== repositoryUrl) failures.push(`${descriptor.name}: repository URL must be ${repositoryUrl}`);
	if (manifest.repository?.directory !== descriptor.directory) {
		failures.push(`${descriptor.name}: repository directory must be ${descriptor.directory}`);
	}
	if (manifest.bugs?.url !== "https://github.com/adrouter/adrouterCLI/issues") {
		failures.push(`${descriptor.name}: canonical bugs URL is missing`);
	}
	if (manifest.homepage !== "https://github.com/adrouter/adrouterCLI#readme") {
		failures.push(`${descriptor.name}: canonical homepage is missing`);
	}
	if (manifest.publishConfig?.access !== "public" || manifest.publishConfig?.provenance !== true) {
		failures.push(`${descriptor.name}: public access and provenance publish metadata are required`);
	}
	for (const dependency of descriptor.dependencies) {
		if (manifest.dependencies?.[dependency] !== targetVersion) {
			failures.push(`${descriptor.name}: ${dependency} must be pinned exactly to ${targetVersion}`);
		}
	}
}

if (readJson("packages/ai/package.json").bin !== undefined) {
	failures.push("@adrouter/ai must not expose an end-user executable alias");
}
const trackedFiles = spawnSync("git", ["ls-files", "-z"], { encoding: "buffer" }).stdout
	.toString("utf8")
	.split("\0")
	.filter(Boolean);
for (const path of trackedFiles) {
	if (existsSync(path) && /\.(?:dll|dylib|exe|node)$/i.test(path)) {
		failures.push(`${path}: unsigned native executable is tracked`);
	}
}
const tuiFiles = readJson("packages/tui/package.json").files ?? [];
if (tuiFiles.some((path) => path.includes("native") || path.endsWith(".node"))) {
	failures.push("@adrouter/tui npm files must omit native helpers");
}
const cliFiles = readJson("packages/coding-agent/package.json").files ?? [];
if (
	JSON.stringify(cliFiles) !==
	JSON.stringify(["dist", "README.md", "BUNDLED_SOURCES.json", "THIRD_PARTY_NOTICES.md", "npm-shrinkwrap.json"])
) {
	failures.push("@adrouter/cli npm files must contain only runtime files and approved package documentation");
}

function scanForOldScope(directory) {
	const readinessScriptPath = normalize("scripts/check-beta-release-readiness.mjs");
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if ([".git", "dist", "install-lock", "node_modules"].includes(entry.name)) continue;
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			scanForOldScope(path);
			continue;
		}
		if (
			!/\.(?:c?js|mjs|json|ts)$/.test(entry.name) ||
			entry.name.endsWith("-lock.json") ||
			entry.name === "npm-shrinkwrap.json" ||
			normalize(path) === readinessScriptPath
		) {
			continue;
		}
		if (readFileSync(path, "utf8").includes("@earendil-works/pi-")) {
			failures.push(`${path}: active old-scope package reference remains`);
		}
	}
}

scanForOldScope("packages");
scanForOldScope("scripts");

const releaseWorkflow = readFileSync(".github/workflows/release-tag.yml", "utf8");
const releaseManifestText = readFileSync("release-manifest.json", "utf8");
for (const asset of [
	"adrouter-darwin-arm64.tar.gz",
	"adrouter-darwin-x64.tar.gz",
	"adrouter-linux-arm64.tar.gz",
	"adrouter-linux-x64.tar.gz",
	"adrouter-windows-arm64.zip",
	"adrouter-windows-x64.zip",
]) {
	if (!releaseManifestText.includes(asset)) failures.push(`release manifest is missing ${asset}`);
}
if (!releaseWorkflow.includes("--prerelease")) failures.push("release workflow must mark GitHub releases as prereleases");
if (!releaseWorkflow.includes("SHA256SUMS")) failures.push("release workflow must publish checksums");
if (/\bpi-(?:darwin|linux|windows)-/.test(releaseWorkflow)) {
	failures.push("release workflow still expects stale pi-* binary artifacts");
}

if (!metadataOnly) {
	const manifest = readJson("docs/bundled-sources.json");
	const expectedBundleRecords = [
		"BTW",
		"pi-cache-optimizer",
		"pi-opencode-bridge",
		"pi-opencode-tui-patch",
		"pi-subagents",
		"pi-web-access",
	];
	const recordedBundleNames = (manifest.bundles ?? []).map((bundle) => bundle.name).sort();
	if (JSON.stringify(recordedBundleNames) !== JSON.stringify(expectedBundleRecords)) {
		failures.push(`bundled source inventory differs: ${recordedBundleNames.join(", ")}`);
	}
	for (const bundle of manifest.bundles ?? []) {
		if (bundle.redistribution?.status !== "cleared") {
			failures.push(`${bundle.name}: written public redistribution clearance is not recorded`);
		}
	}
	const expectedBundleDirectories = [
		"adroutercli",
		"btw-23017e9",
		"pi-cache-optimizer-2.6.16",
		"pi-opencode-bridge-0.2.1",
		"pi-subagents-0.30.0",
		"pi-web-access-0.13.0",
	];
	const bundleDirectories = readdirSync("packages/coding-agent/bundled", { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
	if (JSON.stringify(bundleDirectories) !== JSON.stringify(expectedBundleDirectories)) {
		failures.push(`packaged bundle directory inventory differs: ${bundleDirectories.join(", ")}`);
	}
	if (
		!readFileSync("docs/bundled-sources.json").equals(
			readFileSync("packages/coding-agent/BUNDLED_SOURCES.json"),
		)
	) {
		failures.push("packaged BUNDLED_SOURCES.json differs from docs/bundled-sources.json");
	}
}

if (failures.length > 0) {
	console.error(`${metadataOnly ? "Beta metadata" : "Beta release readiness"} check failed:`);
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(`${metadataOnly ? "Beta metadata" : "Beta release readiness"} check passed.`);
