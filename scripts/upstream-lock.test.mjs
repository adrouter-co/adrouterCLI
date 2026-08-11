import assert from "node:assert/strict";
import test from "node:test";
import {
	componentById,
	generatedBundledSources,
	generatedRuntimeModuleText,
	readUpstreamLock,
	validateUpstreamLock,
} from "./upstream-lock.mjs";

test("canonical upstream lock is valid and complete", () => {
	const lock = readUpstreamLock();
	assert.deepEqual(validateUpstreamLock(lock), []);
	assert.equal(componentById(lock, "pi-core")?.target?.version, "0.84.1");
	assert.equal(componentById(lock, "pi-cache-optimizer")?.target?.version, "2.8.2");
	assert.equal(componentById(lock, "pi-subagents")?.target?.version, "0.45.2");
});

test("public bundle inventory and runtime module are generated deterministically", () => {
	const lock = readUpstreamLock();
	assert.deepEqual(
		generatedBundledSources(lock).bundles.map((bundle) => bundle.name),
		["pi-subagents", "pi-cache-optimizer", "pi-web-access", "BTW", "pi-opencode-tui-patch"],
	);
	const first = generatedRuntimeModuleText(lock);
	assert.equal(first, generatedRuntimeModuleText(JSON.parse(JSON.stringify(lock))));
	assert.match(first, /pi-subagents-0\.45\.2/);
	assert.match(first, /pi-cache-optimizer-2\.8\.2/);
	assert.match(first, /GENERATED_BUNDLE_DIRECTORIES/);
});

test("lock validation rejects duplicate identities and unsafe source URLs", () => {
	const lock = structuredClone(readUpstreamLock());
	lock.components[1].id = lock.components[0].id;
	lock.components[2].target.source_url = "http://example.test/source.tgz";
	const failures = validateUpstreamLock(lock);
	assert.ok(failures.some((failure) => failure.includes("duplicate component id")));
	assert.ok(failures.some((failure) => failure.includes("must use HTTPS")));
});
