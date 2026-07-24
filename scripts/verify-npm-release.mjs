#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";

const packages = [
	{ directory: "packages/ai", name: "@adrouter/ai" },
	{ directory: "packages/tui", name: "@adrouter/tui" },
	{ directory: "packages/agent", name: "@adrouter/agent-core" },
	{ directory: "packages/coding-agent", name: "@adrouter/cli" },
];
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const artifactManifest = JSON.parse(readFileSync("npm-artifacts.json", "utf8"));

function npmView(specifier, field) {
	const args = ["view", specifier];
	if (field) args.push(field);
	args.push("--json", "--registry", "https://registry.npmjs.org/");
	const result = spawnSync("npm", args, { encoding: "utf8" });
	if (result.status !== 0) {
		throw new Error(
			`Could not read npm state for ${specifier} ${field}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
		);
	}
	const value = JSON.parse(result.stdout);
	return Array.isArray(value) ? value.at(-1) : value;
}

function publicationMetadata(manifest) {
	return {
		bin: manifest.bin ?? null,
		dependencies: manifest.dependencies ?? {},
		description: manifest.description ?? "",
		engines: manifest.engines ?? {},
		name: manifest.name,
		repository: manifest.repository ?? null,
		version: manifest.version,
	};
}

if (artifactManifest.version !== version || artifactManifest.tag !== "beta") {
	throw new Error(`npm-artifacts.json does not describe ${version} under beta`);
}

for (const pkg of packages) {
	const tags = npmView(pkg.name, "dist-tags");
	const remote = npmView(`${pkg.name}@${version}`);
	const local = JSON.parse(readFileSync(join(pkg.directory, "package.json"), "utf8"));
	const artifact = artifactManifest.packages.find(({ name }) => name === pkg.name);

	if (!artifact) throw new Error(`npm-artifacts.json is missing ${pkg.name}`);
	if (tags.beta !== version) {
		throw new Error(`${pkg.name} beta points to ${tags.beta ?? "nothing"}, expected ${version}`);
	}
	if (tags.latest === version) throw new Error(`${pkg.name} prerelease must not be assigned to latest`);
	if (remote.version !== version) throw new Error(`${pkg.name} resolved to ${remote.version}, expected ${version}`);
	if (remote.dist?.integrity !== artifact.integrity) {
		throw new Error(`${pkg.name}@${version} registry integrity differs from the tagged artifact`);
	}
	if (!isDeepStrictEqual(publicationMetadata(remote), publicationMetadata(local))) {
		throw new Error(`${pkg.name}@${version} registry metadata differs from the tagged manifest`);
	}
}

console.log(`All four npm packages match tagged metadata and integrity at ${version} under beta.`);
