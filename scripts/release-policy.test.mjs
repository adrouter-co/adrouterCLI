import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
	PUBLICATION_ORDER,
	assertPackageOrder,
	assertResumablePublication,
	publicationChannel,
} from "./release-policy.mjs";

const version = "0.81.0-beta.1";
const integrity = "sha512-local";
const channel = publicationChannel(version);

function states(statuses, overrides = {}) {
	return PUBLICATION_ORDER.map((name, index) => ({
		localIntegrity: integrity,
		metadataMatches: true,
		name,
		registryIntegrity: statuses[index] === "missing" ? undefined : integrity,
		stageTag: statuses[index] === "staged" ? "beta" : undefined,
		status: statuses[index],
		tags: statuses[index] === "published" ? { beta: version, latest: "0.80.0" } : { latest: "0.80.0" },
		version,
		...overrides[name],
	}));
}

test("maps beta SemVer to beta and rejects unsupported prerelease channels", () => {
	assert.deepEqual(channel, { prerelease: true, tag: "beta" });
	assert.throws(() => publicationChannel("0.81.0-rc.0"), /must use beta/);
	assert.throws(() => publicationChannel("not-semver"), /Invalid SemVer/);
});

test("permits a verified prefix for safe partial-publication resume", () => {
	assert.doesNotThrow(() => assertResumablePublication(states(["published", "staged", "missing", "missing"]), version, channel));
	assert.doesNotThrow(() => assertResumablePublication(states(["published", "published", "published", "published"]), version, channel));
});

test("rejects integrity mismatch, incorrect tags, and accidental latest", () => {
	assert.throws(
		() =>
			assertResumablePublication(
				states(["published", "missing", "missing", "missing"], {
					"@adrouter/ai": { registryIntegrity: "sha512-other" },
				}),
				version,
				channel,
			),
		/integrity differs/,
	);
	assert.throws(
		() =>
			assertResumablePublication(
				states(["published", "missing", "missing", "missing"], {
					"@adrouter/ai": { tags: { beta: "0.80.0", latest: "0.80.0" } },
				}),
				version,
				channel,
			),
		/incorrect dist-tag/,
	);
	assert.throws(
		() =>
			assertResumablePublication(
				states(["published", "missing", "missing", "missing"], {
					"@adrouter/ai": { tags: { beta: version, latest: version } },
				}),
				version,
				channel,
			),
		/never move latest/,
	);
});

test("enforces dependency order and CLI-last", () => {
	assert.throws(
		() => assertResumablePublication(states(["missing", "staged", "missing", "missing"]), version, channel),
		/Unsafe publication gap/,
	);
	assert.throws(
		() => assertPackageOrder([...states(["missing", "missing", "missing", "missing"])].reverse()),
		/cli last/,
	);
});

test("release workflows are bound to the canonical repository and registry install gate", () => {
	const releaseTag = readFileSync(".github/workflows/release-tag.yml", "utf8");
	const bootstrap = readFileSync(".github/workflows/npm-bootstrap.yml", "utf8");
	const promote = readFileSync(".github/workflows/promote-release.yml", "utf8");

	for (const [name, workflow] of [
		["release-tag", releaseTag],
		["npm-bootstrap", bootstrap],
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
	assert.ok(
		promote.indexOf("node scripts/verify-registry-install.mjs") <
			promote.indexOf("gh release edit"),
		"GitHub publication must follow registry installation",
	);
});
