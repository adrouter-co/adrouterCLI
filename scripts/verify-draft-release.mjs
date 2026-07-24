#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tag = process.argv[2];
if (!tag) throw new Error("Usage: node scripts/verify-draft-release.mjs <tag>");

function run(command, args, cwd) {
	const result = spawnSync(command, args, { cwd, encoding: "utf8" });
	if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
	return result.stdout.trim();
}

const draft = JSON.parse(run("gh", ["release", "view", tag, "--json", "isDraft,isPrerelease"]));
if (!draft.isDraft || !draft.isPrerelease) throw new Error(`${tag} is not a draft prerelease`);

const directory = mkdtempSync(join(tmpdir(), "adrouter-draft-"));
try {
	run("gh", ["release", "download", tag, "--dir", directory], process.cwd());
	const expected = [
		"BUNDLED_SOURCES.json",
		"SHA256SUMS",
		"THIRD_PARTY_NOTICES.md",
		`adrouter-cli-${tag.replace(/^v/, "")}.tgz`,
		"adrouterCLI.cdx.json",
		"npm-artifacts.json",
	];
	const actual = readdirSync(directory).sort();
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(`Draft inventory mismatch: ${actual.join(", ")}`);
	}
	run("sha256sum", ["-c", "SHA256SUMS"], directory);
	const tarballName = `adrouter-cli-${tag.replace(/^v/, "")}.tgz`;
	const artifactManifest = JSON.parse(readFileSync(join(directory, "npm-artifacts.json"), "utf8"));
	const artifact = artifactManifest.packages?.[0];
	if (artifactManifest.packages?.length !== 1 || artifact?.filename !== tarballName) {
		throw new Error("Draft npm artifact manifest must describe only the bundled CLI tarball");
	}
	const tarballIntegrity = `sha512-${createHash("sha512")
		.update(readFileSync(join(directory, tarballName)))
		.digest("base64")}`;
	if (artifact.integrity !== tarballIntegrity) {
		throw new Error("Draft npm tarball integrity differs from npm-artifacts.json");
	}
	for (const artifact of [
		"adrouterCLI.cdx.json",
		tarballName,
		"BUNDLED_SOURCES.json",
		"npm-artifacts.json",
		"THIRD_PARTY_NOTICES.md",
	]) {
		const args = ["attestation", "verify", join(directory, artifact), "--repo", "adrouter/adrouterCLI"];
		if (artifact === "adrouterCLI.cdx.json") {
			args.push("--predicate-type", "https://cyclonedx.org/bom");
		}
		run("gh", args);
	}
	const sbom = JSON.parse(readFileSync(join(directory, "adrouterCLI.cdx.json"), "utf8"));
	if (sbom.bomFormat !== "CycloneDX") throw new Error("Release SBOM is not CycloneDX");
	console.log(`Verified draft release ${tag}.`);
} finally {
	rmSync(directory, { recursive: true, force: true });
}
