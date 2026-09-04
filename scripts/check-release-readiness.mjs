#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, normalize } from "node:path";
import { publicBundleNames, readUpstreamLock, validateUpstreamLock } from "./upstream-lock.mjs";

const targetVersion = JSON.parse(readFileSync("package.json", "utf8")).version;
const repositoryUrl = "git+https://github.com/adrouter-co/adrouterCLI.git";
const packages = [
	{ directory: "packages/ai", name: "@adrouter/ai", dependencies: [], public: false },
	{ directory: "packages/tui", name: "@adrouter/tui", dependencies: [], public: false },
	{ directory: "packages/agent", name: "@adrouter/agent-core", dependencies: ["@adrouter/ai"], public: false },
	{
		directory: "packages/coding-agent",
		name: "@adrouter/cli",
		dependencies: ["@adrouter/agent-core", "@adrouter/ai", "@adrouter/tui"],
		public: true,
	},
];
const metadataOnly = process.argv.includes("--metadata-only");
const unknownArgs = process.argv.slice(2).filter((argument) => argument !== "--metadata-only");

if (unknownArgs.length > 0) {
	console.error("Usage: node scripts/check-release-readiness.mjs [--metadata-only]");
	process.exit(2);
}

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

const failures = [];
const upstreamLock = readUpstreamLock();
for (const failure of validateUpstreamLock(upstreamLock)) failures.push(`upstreams.lock.json: ${failure}`);

for (const descriptor of packages) {
	const manifest = readJson(join(descriptor.directory, "package.json"));
	if (manifest.name !== descriptor.name) failures.push(`${descriptor.directory}: expected package name ${descriptor.name}`);
	if (manifest.version !== targetVersion) failures.push(`${descriptor.name}: expected version ${targetVersion}`);
	if (descriptor.public && manifest.private === true) failures.push(`${descriptor.name}: public package must not be private`);
	if (!descriptor.public && manifest.private !== true) failures.push(`${descriptor.name}: internal package must be private`);
	if (manifest.repository?.url !== repositoryUrl) failures.push(`${descriptor.name}: repository URL must be ${repositoryUrl}`);
	if (manifest.repository?.directory !== descriptor.directory) {
		failures.push(`${descriptor.name}: repository directory must be ${descriptor.directory}`);
	}
	if (manifest.bugs?.url !== "https://github.com/adrouter-co/adrouterCLI/issues") {
		failures.push(`${descriptor.name}: canonical bugs URL is missing`);
	}
	if (manifest.homepage !== "https://github.com/adrouter-co/adrouterCLI#readme") {
		failures.push(`${descriptor.name}: canonical homepage is missing`);
	}
	if (
		descriptor.public &&
		(manifest.publishConfig?.access !== "public" ||
			manifest.publishConfig?.tag !== "candidate" ||
			manifest.publishConfig?.provenance !== undefined)
	) {
		failures.push(`${descriptor.name}: publication metadata must use public candidate access without forced provenance`);
	}
	if (!descriptor.public && manifest.publishConfig !== undefined) {
		failures.push(`${descriptor.name}: private internal package must not define publishConfig`);
	}
	for (const dependency of descriptor.dependencies) {
		if (manifest.dependencies?.[dependency] !== targetVersion) {
			failures.push(`${descriptor.name}: ${dependency} must be pinned exactly to ${targetVersion}`);
		}
	}
}

const cliManifest = readJson("packages/coding-agent/package.json");
const expectedBundles = ["@adrouter/agent-core", "@adrouter/ai", "@adrouter/tui"];
if (JSON.stringify(cliManifest.bundleDependencies) !== JSON.stringify(expectedBundles)) {
	failures.push("@adrouter/cli must bundle exactly the three internal workspaces");
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
	const readinessScriptPath = normalize("scripts/check-release-readiness.mjs");
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
const releaseManifest = JSON.parse(releaseManifestText);
const authenticationFixturePath = releaseManifest.authentication?.fixture;
if (
	authenticationFixturePath !== "packages/ai/test/fixtures/platform-auth-v1.json" ||
	releaseManifest.authentication?.acceptanceAsset !== "authentication-acceptance.json" ||
	!existsSync(authenticationFixturePath) ||
	createHash("sha256").update(readFileSync(authenticationFixturePath)).digest("hex") !==
		releaseManifest.authentication?.fixtureSha256
) {
	failures.push("release manifest does not pin the canonical platform-auth-v1 fixture");
}
const prerelease = /-beta\.\d+$/.test(targetVersion);
if (
	releaseManifest.schema !== 2 ||
	releaseManifest.version !== targetVersion ||
	releaseManifest.release?.candidateTag !== "candidate" ||
	releaseManifest.release?.githubPrerelease !== prerelease ||
	releaseManifest.release?.finalTags?.latest !== targetVersion
) {
	failures.push("release manifest does not define the candidate and final channel for this version");
}
if (prerelease && releaseManifest.release?.finalTags?.beta !== targetVersion) {
	failures.push("beta release manifest must promote both beta and latest to this version");
}
if (!prerelease && !/^\d+\.\d+\.\d+-beta\.\d+$/.test(releaseManifest.release?.finalTags?.beta ?? "")) {
	failures.push("stable release manifest must preserve an explicit beta version");
}
if (!prerelease) {
	const soak = releaseManifest.release?.soak;
	const startedAt = Date.parse(soak?.startedAt ?? "");
	if (
		soak?.betaVersion !== releaseManifest.release.finalTags.beta ||
		!Number.isFinite(startedAt) ||
		Date.now() - startedAt < 48 * 60 * 60 * 1000
	) {
		failures.push("stable release requires a recorded 48-hour soak of the preserved beta version");
	}
	for (const platform of ["darwin", "linux", "windows"]) {
		if (typeof soak?.cohortEvidence?.[platform] !== "string" || soak.cohortEvidence[platform].trim() === "") {
			failures.push(`stable release requires packaged-user cohort evidence for ${platform}`);
		}
	}

	const betaTag = `v${releaseManifest.release.finalTags.beta}`;
	const betaExists = spawnSync("git", ["rev-parse", "--verify", "--quiet", `${betaTag}^{commit}`]);
	if (betaExists.status !== 0) {
		failures.push(`stable release beta baseline tag is missing: ${betaTag}`);
	} else {
		const diff = spawnSync("git", ["diff", "--name-only", betaTag, "HEAD"], { encoding: "utf8" });
		const stableMetadataPaths = new Set([
			"README.md",
			"docs/releasing.md",
			"package-lock.json",
			"package.json",
			"packages/agent/docs/CHANGELOG.md",
			"packages/agent/package.json",
			"packages/ai/docs/CHANGELOG.md",
			"packages/ai/package.json",
			"packages/coding-agent/docs/CHANGELOG.md",
			"packages/coding-agent/docs/README.md",
			"packages/coding-agent/npm-shrinkwrap.json",
			"packages/coding-agent/package.json",
			"packages/tui/docs/CHANGELOG.md",
			"packages/tui/package.json",
			"release-manifest.json",
		]);
		const behaviorChanges = diff.stdout
			.split(/\r?\n/)
			.filter(Boolean)
			.filter((path) => !stableMetadataPaths.has(path));
		if (behaviorChanges.length > 0) {
			failures.push(`stable release differs from ${betaTag} outside release metadata: ${behaviorChanges.join(", ")}`);
		}
	}
}
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
if (!releaseWorkflow.includes("prerelease_args")) {
	failures.push("release workflow must select GitHub prerelease state from the version");
}
if (!releaseWorkflow.includes("SHA256SUMS")) failures.push("release workflow must publish checksums");
if (/\bpi-(?:darwin|linux|windows)-/.test(releaseWorkflow)) {
	failures.push("release workflow still expects stale pi-* binary artifacts");
}

if (!metadataOnly) {
	const manifest = readJson("docs/bundled-sources.json");
	const expectedBundleRecords = publicBundleNames(upstreamLock).sort();
	const recordedBundleNames = (manifest.bundles ?? []).map((bundle) => bundle.name).sort();
	if (JSON.stringify(recordedBundleNames) !== JSON.stringify(expectedBundleRecords)) {
		failures.push(`bundled source inventory differs: ${recordedBundleNames.join(", ")}`);
	}
	for (const bundle of manifest.bundles ?? []) {
		if (bundle.redistribution?.status !== "cleared") {
			failures.push(`${bundle.name}: written public redistribution clearance is not recorded`);
		}
	}
	const expectedBundleDirectories = [...upstreamLock.runtime.bundle_directories].sort();
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
	console.error(`${metadataOnly ? "Release metadata" : "Release readiness"} check failed:`);
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(`${metadataOnly ? "Release metadata" : "Release readiness"} check passed.`);
