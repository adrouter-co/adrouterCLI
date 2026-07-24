#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

const expectedVersion = JSON.parse(readFileSync("package.json", "utf8")).version;
const root = mkdtempSync(join(tmpdir(), "adrouter-registry-install-"));
const prefix = join(root, "prefix");
const isolatedHome = join(root, "home");
const userConfig = join(root, "anonymous.npmrc");
writeFileSync(userConfig, "registry=https://registry.npmjs.org/\nalways-auth=false\n", { mode: 0o600 });

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const binDirectory = process.platform === "win32" ? prefix : join(prefix, "bin");
const env = {
	...process.env,
	ADROUTER_CODING_AGENT_DIR: join(root, "state"),
	HOME: isolatedHome,
	NPM_CONFIG_PREFIX: prefix,
	NPM_CONFIG_USERCONFIG: userConfig,
	npm_config_prefix: prefix,
	npm_config_userconfig: userConfig,
	PATH: `${binDirectory}${delimiter}${process.env.PATH ?? ""}`,
	PI_NO_LOCAL_LLM: "1",
	USERPROFILE: isolatedHome,
};
for (const name of Object.keys(env)) {
	if (/^(?:NODE_AUTH_TOKEN|NPM_TOKEN)$/i.test(name) || /^NPM_CONFIG_.*AUTH/i.test(name)) delete env[name];
}

function executable(name) {
	return process.platform === "win32" ? join(prefix, `${name}.cmd`) : join(prefix, "bin", name);
}

function run(command, args, timeout = 45_000) {
	const result = spawnSync(command, args, {
		encoding: "utf8",
		env,
		timeout,
	});
	if (result.status !== 0) {
		throw new Error(
			`${command} ${args.join(" ")} failed (status ${result.status}, signal ${result.signal ?? "none"}, error ${
				result.error?.message ?? "none"
			})\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
		);
	}
	return result.stdout;
}

try {
	run(
		npm,
		[
			"install",
			"--global",
			"--ignore-scripts",
			"--no-audit",
			"--no-fund",
			"--registry",
			"https://registry.npmjs.org/",
			"@adrouter/cli@beta",
		],
		120_000,
	);

	const adrouter = executable("adrouter");
	const profile = executable("adrouter-profile");
	for (const path of [adrouter, profile]) {
		if (!existsSync(path)) throw new Error(`Expected installed command is missing: ${path}`);
	}

	const version = run(adrouter, ["--version"]).trim();
	if (version !== expectedVersion) throw new Error(`adrouter --version returned ${version}, expected ${expectedVersion}`);
	if (!run(adrouter, ["--help"]).includes("Usage:")) throw new Error("adrouter --help did not contain Usage:");
	run(profile, ["list"]);
	const doctor = JSON.parse(run(adrouter, ["--json", "doctor"]));
	if (!doctor || typeof doctor !== "object") throw new Error("adrouter --json doctor did not return a JSON object");
	run(adrouter, ["--offline", "--no-approve", "--list-models", "adrouter"]);

	const packageRoot =
		process.platform === "win32"
			? join(prefix, "node_modules", "@adrouter", "cli")
			: join(prefix, "lib", "node_modules", "@adrouter", "cli");
	for (const resource of [
		"package.json",
		"BUNDLED_SOURCES.json",
		"THIRD_PARTY_NOTICES.md",
		join("dist", "cli.js"),
		join("dist", "profile-cli.js"),
		join("dist", "modes", "interactive", "theme", "dark.json"),
		join("node_modules", "@adrouter", "ai", "dist", "index.js"),
		join("node_modules", "@adrouter", "tui", "dist", "index.js"),
		join("node_modules", "@adrouter", "agent-core", "dist", "index.js"),
	]) {
		const path = join(packageRoot, resource);
		if (!existsSync(path)) throw new Error(`Installed package resource is missing: ${path}`);
	}
	const installedVersion = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")).version;
	if (installedVersion !== expectedVersion) {
		throw new Error(`Installed package metadata is ${installedVersion}, expected ${expectedVersion}`);
	}
	const dependencyTree = JSON.parse(run(npm, ["ls", "--global", "--all", "--json", "--prefix", prefix]));
	if (dependencyTree.problems?.length) {
		throw new Error(`Global dependency tree is invalid: ${dependencyTree.problems.join(", ")}`);
	}

	console.log(`Anonymous registry install verified bundled @adrouter/cli@${expectedVersion} and both commands.`);
} finally {
	rmSync(root, { recursive: true, force: true });
}
