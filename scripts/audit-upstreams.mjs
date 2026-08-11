#!/usr/bin/env node

import { readUpstreamLock, validateUpstreamLock } from "./upstream-lock.mjs";

const json = process.argv.includes("--json");
const unknown = process.argv.slice(2).filter((argument) => argument !== "--json");
if (unknown.length > 0) {
	console.error("Usage: node scripts/audit-upstreams.mjs [--json]");
	process.exit(2);
}

const lock = readUpstreamLock();
const failures = validateUpstreamLock(lock);
if (failures.length > 0) throw new Error(`Invalid upstream lock: ${failures.join("; ")}`);

async function latestNpmVersion(packageName) {
	const encoded = packageName.startsWith("@") ? packageName.replace("/", "%2F") : packageName;
	const response = await fetch(`https://registry.npmjs.org/${encoded}/latest`, {
		headers: { accept: "application/json", "user-agent": "AdRouterCLI upstream audit" },
		signal: AbortSignal.timeout(15_000),
	});
	if (!response.ok) throw new Error(`${packageName}: npm returned HTTP ${response.status}`);
	const body = await response.json();
	if (typeof body.version !== "string") throw new Error(`${packageName}: npm response has no version`);
	return body.version;
}

const records = [];
for (const component of lock.components) {
	const packageName = component.discovery?.npm_package;
	if (!packageName) continue;
	try {
		const latest = await latestNpmVersion(packageName);
		records.push({
			component: component.id,
			package: packageName,
			active: component.active?.version ?? null,
			target: component.target?.version ?? null,
			latest,
			update_available: latest !== (component.target?.version ?? component.active?.version),
		});
	} catch (error) {
		records.push({ component: component.id, package: packageName, error: error instanceof Error ? error.message : String(error) });
	}
}

if (json) {
	console.log(JSON.stringify({ checked_at: new Date().toISOString(), records }, null, 2));
} else {
	for (const record of records) {
		if (record.error) console.log(`${record.component}: unavailable (${record.error})`);
		else console.log(`${record.component}: active ${record.active ?? "none"}, target ${record.target ?? "none"}, latest ${record.latest}${record.update_available ? " (newer than frozen target)" : ""}`);
	}
}

if (records.some((record) => record.error)) process.exitCode = 1;
