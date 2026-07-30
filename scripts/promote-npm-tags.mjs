#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const packageName = "@adrouter/cli";
const verifierPath = fileURLToPath(new URL("verify-npm-release.mjs", import.meta.url));
const finalStateAttempts = 12;
const finalStateRetryMs = 5_000;
const manifest = JSON.parse(readFileSync("npm-artifacts.json", "utf8"));
const version = manifest.version;
const publication = manifest.publication;
if (manifest.schema !== 2 || publication?.candidateTag !== "candidate" || !publication.finalTags) {
	throw new Error("npm-artifacts.json has no schema-2 publication policy");
}

function run(command, args) {
	const executable = process.platform === "win32" ? `${command}.cmd` : command;
	const result = spawnSync(executable, args, {
		encoding: "utf8",
		shell: process.platform === "win32",
		stdio: "inherit",
	});
	if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
}

function npmJson(args, { allowNotFound = false } = {}) {
	const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", [
		...args,
		"--json",
		"--registry",
		"https://registry.npmjs.org/",
		"--min-release-age=0",
	], {
		encoding: "utf8",
		shell: process.platform === "win32",
	});
	if (result.status !== 0) {
		if (allowNotFound) {
			try {
				const error = JSON.parse(result.stdout);
				if (error?.error?.code === "E404") return undefined;
			} catch {
				// Preserve the original npm failure below when stdout is not JSON.
			}
		}
		throw new Error(`npm ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
	}
	return JSON.parse(result.stdout);
}

async function verifyFinalState() {
	for (let attempt = 1; attempt <= finalStateAttempts; attempt += 1) {
		const result = spawnSync(process.execPath, [verifierPath, "--state", "final"], {
			encoding: "utf8",
			shell: process.platform === "win32",
		});
		if (result.status === 0) {
			process.stdout.write(result.stdout);
			process.stderr.write(result.stderr);
			return;
		}
		if (attempt === finalStateAttempts) {
			process.stdout.write(result.stdout);
			process.stderr.write(result.stderr);
			throw new Error(`npm final state did not become visible after ${finalStateAttempts} attempts`);
		}
		console.warn(
			`npm final state is not visible yet (attempt ${attempt}/${finalStateAttempts}); retrying in ${finalStateRetryMs / 1_000}s`,
		);
		await new Promise((resolve) => setTimeout(resolve, finalStateRetryMs));
	}
}

run("node", [verifierPath, "--state", "resumable"]);
const currentTags = npmJson(["view", packageName, "dist-tags"]);
for (const [tag, target] of Object.entries(publication.finalTags)) {
	if (currentTags[tag] === target) continue;
	run("npm", [
		"dist-tag",
		"add",
		`${packageName}@${target}`,
		tag,
		"--registry",
		"https://registry.npmjs.org/",
	]);
}
if (currentTags[publication.candidateTag] !== undefined) {
	if (currentTags[publication.candidateTag] !== version) {
		throw new Error(`${packageName} has a conflicting ${publication.candidateTag} dist-tag`);
	}
	run("npm", [
		"dist-tag",
		"rm",
		packageName,
		publication.candidateTag,
		"--registry",
		"https://registry.npmjs.org/",
	]);
}
if (publication.supersedes) {
	const supersededSpecifier = `${packageName}@${publication.supersedes}`;
	const deprecation = `Superseded by ${packageName}@${version}; reinstall @beta.`;
	const supersededMetadata = npmJson(["view", supersededSpecifier], { allowNotFound: true });
	if (supersededMetadata === undefined) {
		console.warn(`${supersededSpecifier} was not published; skipping optional deprecation.`);
	} else if (supersededMetadata.deprecated !== deprecation) {
		run("npm", [
			"deprecate",
			supersededSpecifier,
			deprecation,
			"--registry",
			"https://registry.npmjs.org/",
		]);
	}
}
await verifyFinalState();
