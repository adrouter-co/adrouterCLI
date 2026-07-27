import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
	PUBLICATION_ORDER,
	assertPackageOrder,
	assertResumablePublication,
	publicationChannel,
} from "./release-policy.mjs";

const version = "0.81.0-beta.6";
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
			tags: status === "published" ? { candidate: version } : {},
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

test("permits a missing package or an exact candidate/final publication", () => {
	assert.doesNotThrow(() => assertResumablePublication(state("missing"), version, channel));
	assert.doesNotThrow(() => assertResumablePublication(state("published"), version, channel));
	assert.doesNotThrow(() =>
		assertResumablePublication(
			state("published", { tags: { beta: version, latest: version } }),
			version,
			channel,
		),
	);
});

test("rejects integrity, conflicting candidate, and untagged publication states", () => {
	assert.throws(
		() => assertResumablePublication(state("published", { registryIntegrity: "sha512-other" }), version, channel),
		/integrity differs/,
	);
	assert.throws(
		() => assertResumablePublication(state("published", { tags: { candidate: "0.80.0" } }), version, channel),
		/conflicting candidate/,
	);
	assert.throws(
		() => assertResumablePublication(state("published", { tags: { latest: "0.81.0-beta.3" } }), version, channel),
		/neither staged as candidate nor promoted to beta/,
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
	const ci = readFileSync(".github/workflows/ci.yml", "utf8");
	const releaseTag = readFileSync(".github/workflows/release-tag.yml", "utf8");
	const promote = readFileSync(".github/workflows/promote-release.yml", "utf8");

	for (const [name, workflow] of [
		["release-tag", releaseTag],
		["promote-release", promote],
	]) {
		assert.match(workflow, /test "\$\{ACTUAL_REPOSITORY\}" = "adrouter\/adrouterCLI"/, `${name} identity guard`);
	}
	assert.match(releaseTag, /tags: \["v\*"\]/);
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
	assert.match(promote, /- publish-candidate/);
	assert.match(promote, /- finalize-release/);
	assert.match(promote, /NODE_AUTH_TOKEN: \$\{\{ secrets\.NPM_TOKEN \}\}/);
	assert.match(promote, /node scripts\/publish\.mjs --publish/);
	assert.match(promote, /--tarball release-assets\/adrouter-cli-\*\.tgz/);
	assert.match(promote, /node scripts\/verify-npm-release\.mjs --state resumable/);
	assert.match(promote, /node scripts\/validate-authentication-acceptance\.mjs/);
	assert.match(promote, /--pattern "authentication-acceptance\.json"/);
	assert.match(promote, /finalize-npm:/);
	assert.match(promote, /path: release-finalizer-source/);
	assert.match(promote, /node release-finalizer-source\/scripts\/promote-npm-tags\.mjs/);
	assert.match(promote, /gh release download "\$\{\{ inputs\.tag \}\}"/);
	assert.match(promote, /subject-path: release-assets\/adrouter-cli-\*\.tgz/);
	assert.match(promote, /path: registry-verifier-source/);
	assert.match(promote, /packages\/ai\/test\/fixtures\/platform-auth-v1\.json/);
	assert.match(promote, /node registry-verifier-source\/scripts\/verify-registry-install\.mjs/);
	assert.match(ci, /node scripts\/verify-registry-install\.mjs --if-published/);
	assert.doesNotMatch(promote, /verify-registry-install\.mjs --if-published/);
	for (const [name, workflow] of [
		["ci", ci],
		["release-tag", releaseTag],
		["promote-release", promote],
	]) {
		assert.doesNotMatch(workflow, /ADROUTER_(?:STAGING_)?API_KEY/, `${name} must not receive inference credentials`);
		assert.doesNotMatch(workflow, /\/v1\/(?:agent\/turn|turn|profile)/, `${name} must not call authenticated APIs`);
		assert.doesNotMatch(workflow, /staging-canary/, `${name} must not depend on the retired bearer canary`);
	}
	assert.ok(
		promote.indexOf("node scripts/validate-authentication-acceptance.mjs") <
			promote.indexOf("node registry-verifier-source/scripts/verify-registry-install.mjs"),
		"authentication acceptance must be validated before installed-runtime finalization",
	);
	assert.ok(
		promote.indexOf("node scripts/verify-npm-release.mjs --state resumable") <
			promote.indexOf("subject-path: release-assets/adrouter-cli-*.tgz"),
		"the recorded npm artifact must match the registry before it is re-attested",
	);
	assert.ok(
		promote.indexOf("node registry-verifier-source/scripts/verify-registry-install.mjs") <
			promote.indexOf("node release-finalizer-source/scripts/promote-npm-tags.mjs"),
		"npm dist-tags must follow registry installation",
	);
	assert.ok(
		promote.indexOf("node release-finalizer-source/scripts/promote-npm-tags.mjs") <
			promote.indexOf("gh release edit"),
		"GitHub publication must follow npm promotion",
	);
	const finalizerSource = readFileSync("scripts/promote-npm-tags.mjs", "utf8");
	assert.match(finalizerSource, /finalStateAttempts = 12/);
	assert.match(finalizerSource, /supersededMetadata\.deprecated !== deprecation/);
	const publishSource = readFileSync("scripts/publish.mjs", "utf8");
	assert.match(publishSource, /"--provenance"/);
	assert.doesNotMatch(publishSource, /"access", "list", "packages"/);
	const installedVerifier = readFileSync("scripts/verify-installed-runtime.mjs", "utf8");
	assert.match(installedVerifier, /platform-auth-v1\.json/);
	assert.match(installedVerifier, /createAdRouterDpopProof/);
});

test("version commands defer workspace reification until private dependency pins are synchronized", () => {
	const rootPackage = JSON.parse(readFileSync("package.json", "utf8"));
	for (const name of ["version:patch", "version:minor", "version:major"]) {
		assert.match(rootPackage.scripts[name], /npm version .* --workspaces-update=false/);
		assert.ok(
			rootPackage.scripts[name].indexOf("--workspaces-update=false") <
				rootPackage.scripts[name].indexOf("node scripts/sync-versions.js"),
			`${name} must synchronize private workspace pins before npm reifies dependencies`,
		);
	}

	const releaseSource = readFileSync("scripts/release.mjs", "utf8");
	assert.match(releaseSource, /npm version \$\{target\} -ws --no-git-tag-version --workspaces-update=false/);
	assert.ok(
		releaseSource.indexOf("--workspaces-update=false") < releaseSource.indexOf("node scripts/sync-versions.js"),
		"explicit releases must synchronize private workspace pins before npm reifies dependencies",
	);
});
