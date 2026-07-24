#!/usr/bin/env node

import { readFileSync } from "node:fs";

const tag = process.argv[2];
if (!tag || !/^v\d+\.\d+\.\d+-beta\.\d+$/.test(tag)) {
	throw new Error("Release tag must have the form vX.Y.Z-beta.N");
}

const version = JSON.parse(readFileSync("package.json", "utf8")).version;
if (tag !== `v${version}`) throw new Error(`Tag ${tag} does not match package version ${version}`);

for (const path of [
	"packages/ai/package.json",
	"packages/tui/package.json",
	"packages/agent/package.json",
	"packages/coding-agent/package.json",
]) {
	const manifest = JSON.parse(readFileSync(path, "utf8"));
	if (manifest.version !== version) throw new Error(`${path} is not lockstep at ${version}`);
}

const releaseManifest = JSON.parse(readFileSync("release-manifest.json", "utf8"));
if (releaseManifest.version !== version) throw new Error("release-manifest.json version does not match");

for (const path of [
	"packages/ai/docs/CHANGELOG.md",
	"packages/tui/docs/CHANGELOG.md",
	"packages/agent/docs/CHANGELOG.md",
	"packages/coding-agent/docs/CHANGELOG.md",
]) {
	if (!readFileSync(path, "utf8").includes(`## [${version}]`)) {
		throw new Error(`${path} has no ${version} release section`);
	}
}

console.log(`Validated release tag ${tag}.`);
