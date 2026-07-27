const TOP_LEVEL_KEYS = [
	"artifacts",
	"candidateVersion",
	"clientKind",
	"cohorts",
	"package",
	"redactionAttestation",
	"releaseTag",
	"repository",
	"schema",
	"sourceCommit",
];
const ARTIFACT_KEYS = ["name", "registryIntegrity"];
const COHORT_KEYS = [
	"architecture",
	"environmentClass",
	"os",
	"recorder",
	"results",
	"runtimeVersion",
	"storageClassification",
	"testedAt",
];
export const RESULT_KEYS = [
	"enrollment",
	"localSecretCleanup",
	"profile",
	"replayRejected",
	"revocation",
	"streamCompletion",
	"tamperRejected",
	"tokenRotation",
	"tokenWithoutKeyRejected",
	"turn",
	"upgradePolicy",
];

function object(value, label) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
	return value;
}

function exactKeys(value, expected, label) {
	const actual = Object.keys(value).sort();
	const declared = [...expected].sort();
	if (JSON.stringify(actual) !== JSON.stringify(declared)) {
		throw new Error(`${label} has unknown or missing fields: ${actual.join(", ")}`);
	}
}

function safeText(value, label, pattern, maxLength = 160) {
	if (typeof value !== "string" || value.length === 0 || value.length > maxLength || !pattern.test(value)) {
		throw new Error(`${label} is invalid`);
	}
}

export function validateAuthenticationAcceptance(input, expected = {}) {
	const value = object(input, "acceptance");
	exactKeys(value, TOP_LEVEL_KEYS, "acceptance");
	if (
		value.schema !== 1 ||
		value.clientKind !== "cli" ||
		value.repository !== "adrouter/adrouterCLI" ||
		value.package !== "@adrouter/cli" ||
		value.redactionAttestation !== true
	) {
		throw new Error("acceptance identity or redaction attestation is invalid");
	}

	safeText(value.candidateVersion, "candidateVersion", /^\d+\.\d+\.\d+(?:-beta\.\d+)?$/);
	if (value.releaseTag !== `v${value.candidateVersion}`) throw new Error("release tag does not match its version");
	safeText(value.sourceCommit, "sourceCommit", /^[0-9a-f]{40}$/);

	if (!Array.isArray(value.artifacts) || value.artifacts.length !== 1) {
		throw new Error("acceptance requires exactly one npm artifact");
	}
	const artifact = object(value.artifacts[0], "artifact");
	exactKeys(artifact, ARTIFACT_KEYS, "artifact");
	if (artifact.name !== `adrouter-cli-${value.candidateVersion}.tgz`)
		throw new Error("artifact name does not match candidate");
	safeText(artifact.registryIntegrity, "artifact.registryIntegrity", /^sha512-[A-Za-z0-9+/=]+$/, 256);

	if (!Array.isArray(value.cohorts) || value.cohorts.length !== 2) {
		throw new Error("acceptance requires exactly two cohorts");
	}
	const distinctSystems = new Set();
	const environmentClasses = new Set();
	for (const [index, rawCohort] of value.cohorts.entries()) {
		const cohort = object(rawCohort, `cohort ${index + 1}`);
		exactKeys(cohort, COHORT_KEYS, `cohort ${index + 1}`);
		if (
			!["primary-operator", "second-os"].includes(cohort.environmentClass) ||
			cohort.storageClassification !== "file_protected"
		) {
			throw new Error(`cohort ${index + 1} environment or storage classification is invalid`);
		}
		if (!["macos", "ubuntu", "windows"].includes(cohort.os) || !["arm64", "x64"].includes(cohort.architecture)) {
			throw new Error(`cohort ${index + 1} platform is invalid`);
		}
		environmentClasses.add(cohort.environmentClass);
		distinctSystems.add(`${cohort.os}/${cohort.architecture}`);
		safeText(cohort.runtimeVersion, `cohort ${index + 1} runtimeVersion`, /^Node\.js v\d+\.\d+\.\d+$/);
		safeText(cohort.recorder, `cohort ${index + 1} recorder`, /^@[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/);
		const testedAt = Date.parse(cohort.testedAt);
		if (!Number.isFinite(testedAt) || testedAt > Date.now() + 5 * 60_000) {
			throw new Error(`cohort ${index + 1} testedAt is invalid`);
		}
		const results = object(cohort.results, `cohort ${index + 1} results`);
		exactKeys(results, RESULT_KEYS, `cohort ${index + 1} results`);
		if (RESULT_KEYS.some((key) => results[key] !== true)) {
			throw new Error(`cohort ${index + 1} contains an unaccepted authentication result`);
		}
	}
	if (distinctSystems.size < 2) throw new Error("acceptance requires two distinct OS/architecture cohorts");
	if (environmentClasses.size !== 2) throw new Error("acceptance requires primary-operator and second-os cohorts");

	for (const [key, actual] of [
		["version", value.candidateVersion],
		["tag", value.releaseTag],
		["commit", value.sourceCommit],
		["artifactName", artifact.name],
		["registryIntegrity", artifact.registryIntegrity],
	]) {
		if (expected[key] !== undefined && expected[key] !== actual) {
			throw new Error(`acceptance ${key} does not match the protected release`);
		}
	}
	return value;
}
