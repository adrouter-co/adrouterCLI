#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

const packageName = "@adrouter/cli";
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const local = JSON.parse(readFileSync("packages/coding-agent/package.json", "utf8"));
const artifactManifest = JSON.parse(readFileSync("npm-artifacts.json", "utf8"));

function npmView(specifier, field) {
	const args = ["view", specifier];
	if (field) args.push(field);
	args.push("--json", "--registry", "https://registry.npmjs.org/");
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

if (artifactManifest.version !== version || artifactManifest.tag !== "beta" || artifactManifest.packages?.length !== 1) {
	throw new Error(`npm-artifacts.json must describe only ${packageName}@${version} under beta`);
}

const tags = npmView(packageName, "dist-tags");
const remote = npmView(`${packageName}@${version}`);
const artifact = artifactManifest.packages[0];
if (tags.beta !== version || tags.latest !== version) {
	throw new Error(`${packageName} beta/latest must both point to ${version}`);
}
if (remote.version !== version) throw new Error(`${packageName} resolved to ${remote.version}, expected ${version}`);
if (remote.dist?.integrity !== artifact.integrity) {
	throw new Error(`${packageName}@${version} registry integrity differs from the tagged artifact`);
}
if (!isDeepStrictEqual(publicationMetadata(remote), publicationMetadata(local))) {
	throw new Error(`${packageName}@${version} registry metadata differs from the tagged manifest`);
}

console.log(`${packageName}@${version} matches tagged metadata and integrity under beta and latest.`);
