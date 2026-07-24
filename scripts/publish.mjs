#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { CLI_PACKAGE, createBundledCliTarball } from "./npm-artifact.mjs";
import { assertPackageTarball, readTarEntries } from "./package-policy.mjs";
import { publicationChannel } from "./release-policy.mjs";

const registry = "https://registry.npmjs.org/";

function option(name) {
	const index = process.argv.indexOf(name);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

const dryRun = process.argv.includes("--dry-run");
const publish = process.argv.includes("--publish");
const manifestPath = option("--manifest");
const outputPath = option("--out");
const inputTarball = option("--tarball");
const valuedOptions = new Set(["--manifest", manifestPath, "--out", outputPath, "--tarball", inputTarball]);
const known = new Set(["--dry-run", "--publish", ...valuedOptions]);
const unknown = process.argv.slice(2).filter((argument) => !known.has(argument));
if (
	unknown.length > 0 ||
	dryRun === publish ||
	(process.argv.includes("--manifest") && !manifestPath) ||
	(process.argv.includes("--out") && !outputPath) ||
	(process.argv.includes("--tarball") && !inputTarball) ||
	(publish && (!manifestPath || !inputTarball))
) {
	throw new Error(
		"Usage: node scripts/publish.mjs --dry-run [--out <directory>] [--manifest <path>]\n" +
			"   or: node scripts/publish.mjs --publish --tarball <path> --manifest <path>",
	);
}

function commandForPlatform(command) {
	return process.platform === "win32" ? `${command}.cmd` : command;
}

function run(command, args, options = {}) {
	const result = spawnSync(commandForPlatform(command), args, {
		cwd: options.cwd,
		encoding: "utf8",
		stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
	});
	if (result.status !== 0) {
		const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
		throw new Error(output ? `${command} ${args.join(" ")} failed\n${output}` : `${command} ${args.join(" ")} failed`);
	}
	return result.stdout ?? "";
}

function npmJsonOrMissing(args) {
	const result = spawnSync(commandForPlatform("npm"), [...args, "--json", "--registry", registry], {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	});
	if (result.status === 0) return JSON.parse(result.stdout || "null");
	const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
	if (/\bE404\b|404 Not Found/.test(output)) return undefined;
	throw new Error(`npm ${args.join(" ")} failed\n${output}`);
}

function packageJsonFromTarball(tarball) {
	const entry = readTarEntries(tarball).find(({ path }) => path === "package/package.json");
	if (!entry) throw new Error(`${tarball} has no package.json`);
	return JSON.parse(entry.content.toString("utf8"));
}

function artifactRecord(tarball, packed) {
	const verified = assertPackageTarball(CLI_PACKAGE, packed, tarball);
	const channel = publicationChannel(verified.version);
	return {
		commit: run("git", ["rev-parse", "HEAD"], { capture: true }).trim(),
		packages: [
			{
				filename: verified.filename,
				integrity: verified.integrity,
				name: verified.name,
				shasum: verified.shasum,
				size: verified.size,
				version: verified.version,
			},
		],
		tag: channel.tag,
		version: verified.version,
	};
}

if (dryRun) {
	const temporaryRoot = outputPath ? undefined : mkdtempSync(join(tmpdir(), "adrouter-publish-"));
	try {
		const outputDirectory = resolve(outputPath ?? join(temporaryRoot, "tarballs"));
		mkdirSync(outputDirectory, { recursive: true });
		const { packed, tarball } = createBundledCliTarball({ outputDirectory });
		const record = artifactRecord(tarball, packed);
		if (manifestPath) writeFileSync(manifestPath, `${JSON.stringify(record, null, 2)}\n`);
		run("npm", [
			"publish",
			tarball,
			"--dry-run",
			"--access",
			"public",
			"--tag",
			record.tag,
			"--ignore-scripts",
			"--provenance=false",
		]);
		console.log(`Validated ${record.packages[0].filename} as the only public ${record.version} artifact.`);
	} finally {
		if (temporaryRoot) rmSync(temporaryRoot, { recursive: true, force: true });
	}
	process.exit(0);
}

const tarball = resolve(inputTarball);
const recorded = JSON.parse(readFileSync(manifestPath, "utf8"));
const localManifest = packageJsonFromTarball(tarball);
const verified = assertPackageTarball(
	CLI_PACKAGE,
	{ filename: recorded.packages?.[0]?.filename, version: localManifest.version },
	tarball,
);
const artifact = recorded.packages?.[0];
const head = run("git", ["rev-parse", "HEAD"], { capture: true }).trim();
if (
	recorded.commit !== head ||
	recorded.version !== localManifest.version ||
	recorded.tag !== "beta" ||
	recorded.packages?.length !== 1 ||
	artifact?.name !== CLI_PACKAGE.name ||
	artifact?.integrity !== verified.integrity ||
	artifact?.filename !== verified.filename
) {
	throw new Error("Recorded npm artifact does not match the exact checkout and tarball selected for publication");
}
if (npmJsonOrMissing(["view", `${CLI_PACKAGE.name}@${recorded.version}`]) !== undefined) {
	throw new Error(`${CLI_PACKAGE.name}@${recorded.version} already exists; npm versions are immutable`);
}
const username = run("npm", ["whoami", "--registry", registry], { capture: true }).trim();
if (!username) throw new Error("npm whoami returned no authenticated user");
run("npm", ["access", "list", "packages", "@adrouter", "--registry", registry], { capture: true });
run("npm", [
	"publish",
	tarball,
	"--access",
	"public",
	"--tag",
	"beta",
	"--ignore-scripts",
	"--provenance=false",
	"--registry",
	registry,
]);
console.log(`Published only ${CLI_PACKAGE.name}@${recorded.version}; verify registry integrity before promotion.`);
