#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

const packageName = "@adrouter/cli";
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const local = JSON.parse(readFileSync("packages/coding-agent/package.json", "utf8"));
const artifactManifest = JSON.parse(readFileSync("npm-artifacts.json", "utf8"));
const stateIndex = process.argv.indexOf("--state");
const expectedState = stateIndex >= 0 ? process.argv[stateIndex + 1] : "candidate";
const expectedArguments = stateIndex >= 0 ? ["--state", expectedState] : [];
if (
	JSON.stringify(process.argv.slice(2)) !== JSON.stringify(expectedArguments) ||
	!["candidate", "final", "resumable"].includes(expectedState)
) {
	throw new Error("Usage: node scripts/verify-npm-release.mjs [--state candidate|final|resumable]");
}

function npmView(specifier, field) {
	const args = ["view", specifier];
	if (field) args.push(field);
	args.push("--json", "--registry", "https://registry.npmjs.org/", "--min-release-age=0");
	const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", args, {
		encoding: "utf8",
		shell: process.platform === "win32",
	});
	if (result.status !== 0) {
		throw new Error(`Could not read npm state for ${specifier} ${field ?? ""}\n${result.stdout}\n${result.stderr}`);
	}
	const value = JSON.parse(result.stdout);
	return Array.isArray(value) ? value.at(-1) : value;
}

function publicationMetadata(manifest) {
	return {
		bin: manifest.bin ?? null,
		bundleDependencies: [...(manifest.bundleDependencies ?? [])].sort(),
		dependencies: manifest.dependencies ?? {},
		description: manifest.description ?? "",
		engines: manifest.engines ?? {},
		name: manifest.name,
		repository: manifest.repository ?? null,
		version: manifest.version,
	};
}

if (
	artifactManifest.schema !== 2 ||
	artifactManifest.version !== version ||
	artifactManifest.publication?.candidateTag !== "candidate" ||
	artifactManifest.packages?.length !== 1
) {
	throw new Error(`npm-artifacts.json must describe only staged ${packageName}@${version}`);
}

const tags = npmView(packageName, "dist-tags");
const remote = npmView(`${packageName}@${version}`);
const artifact = artifactManifest.packages[0];
const candidateMatches = tags[artifactManifest.publication.candidateTag] === version;
const finalMatches = Object.entries(artifactManifest.publication.finalTags ?? {}).every(
	([tag, expected]) => tags[tag] === expected,
);
const candidateConflicts =
	tags[artifactManifest.publication.candidateTag] !== undefined && !candidateMatches;
if (candidateConflicts) {
	throw new Error(
		`${packageName} dist-tag ${artifactManifest.publication.candidateTag} conflicts with ${version}`,
	);
}
if (expectedState === "final") {
	for (const [tag, expected] of Object.entries(artifactManifest.publication.finalTags ?? {})) {
		if (tags[tag] !== expected) throw new Error(`${packageName} dist-tag ${tag} is ${tags[tag]}, expected ${expected}`);
	}
	if (tags[artifactManifest.publication.candidateTag] !== undefined) {
		throw new Error(`${packageName} candidate dist-tag was not removed after promotion`);
	}
} else if (expectedState === "candidate" && !candidateMatches) {
	throw new Error(`${packageName} candidate dist-tag must point to ${version}`);
} else if (expectedState === "resumable" && !candidateMatches && !finalMatches) {
	throw new Error(`${packageName}@${version} is neither an exact candidate nor an exact final publication`);
}
if (remote.version !== version) throw new Error(`${packageName} resolved to ${remote.version}, expected ${version}`);
if (remote.dist?.integrity !== artifact.integrity) {
	throw new Error(`${packageName}@${version} registry integrity differs from the tagged artifact`);
}
if (!isDeepStrictEqual(publicationMetadata(remote), publicationMetadata(local))) {
	throw new Error(`${packageName}@${version} registry metadata differs from the tagged manifest`);
}

console.log(
	`${packageName}@${version} matches tagged metadata and integrity in ${expectedState} state.`,
);
