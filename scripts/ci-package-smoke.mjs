#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function commandPath(directory, name) {
	return join(directory, "node_modules", ".bin", process.platform === "win32" ? `${name}.cmd` : name);
}

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd,
		encoding: "utf8",
		env: options.env,
		stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
	});
	if (result.status !== 0) {
		throw new Error(
			`${command} ${args.join(" ")} failed\n${[result.stdout, result.stderr].filter(Boolean).join("\n")}`,
		);
	}
	return result.stdout ?? "";
}

const root = process.cwd();
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const smokeRoot = mkdtempSync(join(tmpdir(), "adrouter-ci-package-smoke-"));
const output = join(smokeRoot, "release");
const isolatedHome = mkdtempSync(join(tmpdir(), "adrouter-ci-home-"));
const project = mkdtempSync(join(tmpdir(), "adrouter-ci-project-"));
try {
	run(process.execPath, [
		join(root, "scripts", "local-release.mjs"),
		"--out",
		output,
		"--skip-check",
		"--skip-test",
		"--skip-binary",
		"--skip-bun-install",
	]);
	const install = join(output, "node");
	const cli = commandPath(install, "adrouter");
	const profiles = commandPath(install, "adrouter-profile");
	const env = {
		...process.env,
		ADROUTER_API_URL: "http://127.0.0.1:1",
		ADROUTER_CODING_AGENT_DIR: join(isolatedHome, ".adrouter", "agent"),
		ADROUTER_PROFILES_DIR: join(isolatedHome, ".adrouter", "profiles"),
		HOME: isolatedHome,
		PI_NO_LOCAL_LLM: "1",
		USERPROFILE: isolatedHome,
	};

	if (run(cli, ["--version"], { capture: true, cwd: project, env }).trim() !== version) {
		throw new Error("Packaged CLI reported the wrong version");
	}
	if (!run(cli, ["--help"], { capture: true, cwd: project, env }).includes("adrouter")) {
		throw new Error("Packaged CLI help is unavailable");
	}
	const doctor = JSON.parse(run(cli, ["--json", "doctor"], { capture: true, cwd: project, env }));
	if (doctor.ok !== true || doctor.version !== version) throw new Error("Packaged doctor JSON is invalid");
	run(cli, ["--offline", "--no-approve", "--list-models", "adrouter"], {
		capture: true,
		cwd: project,
		env,
	});

	run(profiles, ["set", "ci", "--provider", "adrouter", "--model", "deepseek-v4-flash"], { cwd: project, env });
	if (!run(profiles, ["list"], { capture: true, cwd: project, env }).includes("ci")) {
		throw new Error("Packaged profile listing failed");
	}
	run(profiles, ["apply", "ci", "--cwd", project, "--no-launch"], { cwd: project, env });
	run(profiles, ["restore", "--cwd", project], { cwd: project, env });

	for (const resource of [
		"BUNDLED_SOURCES.json",
		"THIRD_PARTY_NOTICES.md",
		"README.md",
		"dist/bundled/adroutercli/skills/adroutercli/docs/SKILL.md",
		"dist/bundled/pi-web-access-0.13.0/dist/index.js",
	]) {
		if (!existsSync(join(install, "node_modules", "@adrouter", "cli", resource))) {
			throw new Error(`Packaged resource is missing: ${resource}`);
		}
	}
	console.log(`Packaged ${version} command and resource smokes passed.`);
} finally {
	rmSync(smokeRoot, { recursive: true, force: true });
	rmSync(isolatedHome, { recursive: true, force: true });
	rmSync(project, { recursive: true, force: true });
}
