import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
	PUBLICATION_ORDER,
	assertPackageOrder,
	assertResumablePublication,
	publicationChannel,
} from "./release-policy.mjs";

const version = "0.81.0-beta.3";
const integrity = "sha512-local";
const channel = publicationChannel(version);

function state(status, overrides = {}) {
	return [
		{
			localIntegrity: integrity,
			metadataMatches: true,
			name: "@adrouter/cli",
			registryIntegrity: status === "missing" ? undefined : integrity,
			status,
			tags: status === "published" ? { beta: version, latest: version } : {},
			version,
			...overrides,
		},
	];
}

test("maps beta SemVer to beta and rejects unsupported prerelease channels", () => {
	assert.deepEqual(channel, { prerelease: true, tag: "beta" });
	assert.throws(() => publicationChannel("0.81.0-rc.0"), /must use beta/);
	assert.throws(() => publicationChannel("not-semver"), /Invalid SemVer/);
});

test("permits a missing package or the exact verified recovery publication", () => {
	assert.doesNotThrow(() => assertResumablePublication(state("missing"), version, channel));
	assert.doesNotThrow(() => assertResumablePublication(state("published"), version, channel));
});

test("rejects integrity, beta tag, and recovery latest mismatches", () => {
	assert.throws(
		() => assertResumablePublication(state("published", { registryIntegrity: "sha512-other" }), version, channel),
		/integrity differs/,
	);
	assert.throws(
		() => assertResumablePublication(state("published", { tags: { beta: "0.80.0", latest: version } }), version, channel),
		/incorrect beta dist-tag/,
	);
	assert.throws(
		() => assertResumablePublication(state("published", { tags: { beta: version, latest: "0.80.0" } }), version, channel),
		/must also be latest/,
	);
});

test("allows only the public CLI package", () => {
	assert.deepEqual(PUBLICATION_ORDER, ["@adrouter/cli"]);
	assert.throws(
		() => assertPackageOrder([{ name: "@adrouter/ai" }, { name: "@adrouter/cli" }]),
		/Only @adrouter\/cli/,
	);
});

test("release workflows are bound to the canonical repository and registry install gate", () => {
	const releaseTag = readFileSync(".github/workflows/release-tag.yml", "utf8");
	const promote = readFileSync(".github/workflows/promote-release.yml", "utf8");

	for (const [name, workflow] of [
		["release-tag", releaseTag],
		["promote-release", promote],
	]) {
		assert.match(workflow, /test "\$\{ACTUAL_REPOSITORY\}" = "adrouter\/adrouterCLI"/, `${name} identity guard`);
	}
	assert.match(releaseTag, /tags: \["v\*-beta\.\*"\]/);
	for (const platform of [
		"linux-x64",
		"linux-arm64",
		"windows-x64",
		"windows-arm64",
		"darwin-x64",
		"darwin-arm64",
	]) {
		assert.match(promote, new RegExp(`platform: ${platform}`));
	}
	assert.match(promote, /needs:\s*\n\s*- promote\s*\n\s*- registry-install/);
	assert.match(promote, /gh release download "\$\{\{ inputs\.tag \}\}"/);
	assert.match(promote, /subject-path: release-assets\/adrouter-cli-\*\.tgz/);
	assert.ok(
		promote.indexOf("node scripts/verify-npm-release.mjs") <
			promote.indexOf("subject-path: release-assets/adrouter-cli-*.tgz"),
		"the recorded npm artifact must match the registry before it is re-attested",
	);
	assert.ok(
		promote.indexOf("node scripts/verify-registry-install.mjs") <
			promote.indexOf("gh release edit"),
		"GitHub publication must follow registry installation",
	);
});
