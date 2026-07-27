#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { validateAuthenticationAcceptance } from "./authentication-acceptance.mjs";

function argument(name) {
	const index = process.argv.indexOf(name);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

const file = argument("--file");
const tag = argument("--tag");
const commit = argument("--commit");
const manifestPath = argument("--manifest");
if (!file || !tag || !commit || !manifestPath) {
	throw new Error(
		"Usage: node scripts/validate-authentication-acceptance.mjs --file <json> --tag <tag> --commit <sha> --manifest <npm-artifacts.json>",
	);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const artifact = manifest.packages?.[0];
if (manifest.packages?.length !== 1 || !artifact?.filename || !artifact?.integrity) {
	throw new Error("npm artifact manifest must describe exactly one integrity-bound package");
}
const value = validateAuthenticationAcceptance(JSON.parse(readFileSync(file, "utf8")), {
	version: tag.replace(/^v/, ""),
	tag,
	commit,
	artifactName: artifact.filename,
	registryIntegrity: artifact.integrity,
});
console.log(`Validated authentication acceptance for ${value.releaseTag}.`);
