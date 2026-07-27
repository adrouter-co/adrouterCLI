import assert from "node:assert/strict";
import test from "node:test";
import { RESULT_KEYS, validateAuthenticationAcceptance } from "./authentication-acceptance.mjs";

function validAcceptance() {
	const results = Object.fromEntries(RESULT_KEYS.map((key) => [key, true]));
	return {
		schema: 1,
		clientKind: "cli",
		repository: "adrouter/adrouterCLI",
		package: "@adrouter/cli",
		candidateVersion: "0.81.0-beta.7",
		releaseTag: "v0.81.0-beta.7",
		sourceCommit: "a".repeat(40),
		artifacts: [
			{
				name: "adrouter-cli-0.81.0-beta.7.tgz",
				registryIntegrity: `sha512-${Buffer.alloc(64).toString("base64")}`,
			},
		],
		cohorts: [
			{
				environmentClass: "primary-operator",
				os: "macos",
				architecture: "arm64",
				runtimeVersion: "Node.js v22.19.0",
				storageClassification: "file_protected",
				testedAt: "2026-07-27T00:00:00.000Z",
				recorder: "@release-operator",
				results,
			},
			{
				environmentClass: "second-os",
				os: "windows",
				architecture: "x64",
				runtimeVersion: "Node.js v22.19.0",
				storageClassification: "file_protected",
				testedAt: "2026-07-27T00:00:00.000Z",
				recorder: "@second-operator",
				results: { ...results },
			},
		],
		redactionAttestation: true,
	};
}

test("accepts exact redacted evidence for two distinct cohorts", () => {
	const value = validAcceptance();
	assert.equal(
		validateAuthenticationAcceptance(value, {
			version: value.candidateVersion,
			tag: value.releaseTag,
			commit: value.sourceCommit,
			artifactName: value.artifacts[0].name,
			registryIntegrity: value.artifacts[0].registryIntegrity,
		}),
		value,
	);
});

test("rejects unknown fields, incomplete results, one cohort, and release mismatches", () => {
	const unknown = validAcceptance();
	unknown.notes = "free text is forbidden";
	assert.throws(() => validateAuthenticationAcceptance(unknown), /unknown or missing fields/);

	const incomplete = validAcceptance();
	incomplete.cohorts[0].results.turn = false;
	assert.throws(() => validateAuthenticationAcceptance(incomplete), /unaccepted authentication result/);

	const oneCohort = validAcceptance();
	oneCohort.cohorts.pop();
	assert.throws(() => validateAuthenticationAcceptance(oneCohort), /exactly two cohorts/);

	assert.throws(
		() => validateAuthenticationAcceptance(validAcceptance(), { commit: "b".repeat(40) }),
		/does not match the protected release/,
	);
});
