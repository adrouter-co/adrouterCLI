#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const packageName = "@adrouter/cli";
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

function npmJson(args) {
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
	if (result.status !== 0) throw new Error(`npm ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
	return JSON.parse(result.stdout);
}

run("node", ["scripts/verify-npm-release.mjs", "--state", "resumable"]);
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
	run("npm", [
		"deprecate",
		`${packageName}@${publication.supersedes}`,
		`Superseded by ${packageName}@${version}; reinstall @beta.`,
		"--registry",
		"https://registry.npmjs.org/",
	]);
}
run("node", ["scripts/verify-npm-release.mjs", "--state", "final"]);
