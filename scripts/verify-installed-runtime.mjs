#!/usr/bin/env node

import { lstatSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const PRIVATE_PACKAGES = ["@adrouter/agent-core", "@adrouter/ai", "@adrouter/tui"];

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

function requiredFeatureSnapshot(resourceLoader) {
	const extensionErrors = resourceLoader.getExtensions().errors;
	assert(extensionErrors.length === 0, `Extension loading failed: ${JSON.stringify(extensionErrors)}`);
	const report = resourceLoader.getBundledFeatureReport?.();
	assert(report?.mode === "required", "Bundled features are not in required mode");
	assert(report.ready === true, `Bundled feature contract failed: ${(report.failures ?? []).join(", ")}`);
	return report;
}

export async function verifyInstalledRuntime({ packageRoot, project, agentDir, expectedVersion }) {
	const cliManifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
	assert(cliManifest.version === expectedVersion, `Installed CLI version is ${cliManifest.version}, expected ${expectedVersion}`);

	for (const name of PRIVATE_PACKAGES) {
		const dependencyRoot = join(packageRoot, "node_modules", ...name.split("/"));
		const stat = lstatSync(dependencyRoot);
		assert(stat.isDirectory() && !stat.isSymbolicLink(), `${name} must be a real nested package directory`);
		const manifest = JSON.parse(readFileSync(join(dependencyRoot, "package.json"), "utf8"));
		assert(manifest.version === expectedVersion, `${name}@${manifest.version} does not match ${expectedVersion}`);
	}

	const api = await import(pathToFileURL(join(packageRoot, "dist", "index.js")).href);
	const createRuntime = async ({ cwd, sessionManager, sessionStartEvent }) => {
		const services = await api.createAgentSessionServices({
			cwd,
			agentDir,
			resourceLoaderOptions: {
				includeBundledFeatures: true,
				noContextFiles: true,
				noPromptTemplates: true,
				noThemes: true,
			},
		});
		const serviceErrors = services.diagnostics.filter(({ type }) => type === "error");
		assert(serviceErrors.length === 0, `Runtime service diagnostics failed: ${JSON.stringify(serviceErrors)}`);
		const created = await api.createAgentSessionFromServices({
			services,
			sessionManager,
			sessionStartEvent,
		});
		return {
			...created,
			services,
			diagnostics: services.diagnostics,
		};
	};

	const runtime = await api.createAgentSessionRuntime(createRuntime, {
		cwd: project,
		agentDir,
		sessionManager: api.SessionManager.inMemory(project),
	});
	try {
		await runtime.session.bindExtensions({});
		requiredFeatureSnapshot(runtime.services.resourceLoader);

		await runtime.session.reload();
		requiredFeatureSnapshot(runtime.services.resourceLoader);

		const result = await runtime.newSession();
		assert(result.cancelled === false, "Bundled extensions cancelled new-session verification");
		await runtime.session.bindExtensions({});
		requiredFeatureSnapshot(runtime.services.resourceLoader);
	} finally {
		await runtime.dispose();
	}
}
