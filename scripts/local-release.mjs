#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	accessSync,
	constants,
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	statSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { delimiter, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { compareBundledPayload } from "./verify-bundled-payload.mjs";
import { assertPackageTarball, PUBLIC_PACKAGES } from "./package-policy.mjs";

const packages = PUBLIC_PACKAGES;
let childEnvironment = process.env;

function printUsage() {
	console.log(`Usage: node scripts/local-release.mjs [options]

Builds and packs the publishable packages, then installs the tarballs into an
isolated directory outside the repository for local release testing.

Options:
  --out <dir>          Output directory. Defaults to a new directory under ${tmpdir()}
  --force              Remove --out first if it already exists
  --skip-check         Do not run npm run check before building
  --skip-test          Do not run ./test.sh before building
  --skip-install       Only create tarballs; do not create isolated installs
  --skip-binary        Do not build the Bun binary release
  --skip-bun-install   Do not create the isolated Bun install
  --help               Show this help
`);
}

function parseArgs() {
	const options = {
		force: false,
		outDir: undefined,
		skipBunInstall: false,
		skipBinary: false,
		skipCheck: false,
		skipInstall: false,
		skipTest: false,
	};
	const args = process.argv.slice(2);

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--help") {
			printUsage();
			process.exit(0);
		}
		if (arg === "--force") {
			options.force = true;
			continue;
		}
		if (arg === "--skip-check") {
			options.skipCheck = true;
			continue;
		}
		if (arg === "--skip-test") {
			options.skipTest = true;
			continue;
		}
		if (arg === "--skip-install") {
			options.skipInstall = true;
			continue;
		}
		if (arg === "--skip-binary") {
			options.skipBinary = true;
			continue;
		}
		if (arg === "--skip-bun-install") {
			options.skipBunInstall = true;
			continue;
		}
		if (arg === "--out") {
			const value = args[++i];
			if (!value) {
				throw new Error("--out requires a directory");
			}
			options.outDir = value;
			continue;
		}
		throw new Error(`Unknown option: ${arg}`);
	}

	return options;
}

function run(command, args, options = {}) {
	console.log(`$ ${[command, ...args].join(" ")}`);
	const result = spawnSync(command, args, {
		cwd: options.cwd,
		encoding: "utf8",
		env: childEnvironment,
		shell: process.platform === "win32",
		stdio: options.capture ? ["inherit", "pipe", "inherit"] : "inherit",
	});

	if (result.status !== 0) {
		throw new Error(`Command failed: ${[command, ...args].join(" ")}`);
	}

	return result.stdout ?? "";
}

function readPackageJson(directory) {
	return JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
}

function findBunDirectory() {
	const executable = process.platform === "win32" ? "bun.exe" : "bun";
	const pathDirectories = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
	const fallbackDirectories = [
		process.env.BUN_INSTALL ? join(process.env.BUN_INSTALL, "bin") : undefined,
		join(homedir(), ".bun", "bin"),
	].filter((directory) => directory !== undefined);

	for (const directory of new Set([...pathDirectories, ...fallbackDirectories])) {
		const candidate = join(directory, executable);
		try {
			accessSync(candidate, constants.X_OK);
		} catch {
			continue;
		}
		if (spawnSync(candidate, ["--version"], { stdio: "ignore" }).status === 0) return directory;
	}

	throw new Error("Bun was not found on PATH, in $BUN_INSTALL/bin, or in ~/.bun/bin.");
}

function isInsidePath(child, parent) {
	const relativePath = relative(parent, child);
	return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

function prepareOutputDirectory(options, repoRoot) {
	if (!options.outDir) {
		return mkdtempSync(join(tmpdir(), "adrouter-local-release-"));
	}

	const outDir = resolve(options.outDir);

	if (isInsidePath(outDir, repoRoot)) {
		throw new Error(`Output directory must be outside the repository: ${outDir}`);
	}

	if (existsSync(outDir)) {
		if (!options.force) {
			throw new Error(`Output directory already exists. Use --force to replace it: ${outDir}`);
		}
		rmSync(outDir, { force: true, recursive: true });
	}

	mkdirSync(outDir, { recursive: true });
	return outDir;
}

function fileSpecifier(fromDirectory, file) {
	const relativePath = relative(fromDirectory, file).replaceAll("\\", "/");
	return `file:${relativePath.startsWith(".") ? relativePath : `./${relativePath}`}`;
}

function currentBinaryPlatform() {
	if (process.platform === "win32") return process.arch === "arm64" ? "windows-arm64" : "windows-x64";
	if (process.platform === "darwin") return process.arch === "arm64" ? "darwin-arm64" : "darwin-x64";
	if (process.platform === "linux") return process.arch === "arm64" ? "linux-arm64" : "linux-x64";
	throw new Error(`Unsupported binary platform: ${process.platform} ${process.arch}`);
}

function buildBunBinaryRelease(targetDirectory, archiveDirectory) {
	const platform = currentBinaryPlatform();
	const binaryBuildDirectory = join(archiveDirectory, "binary-build");
	run("./scripts/build-binaries.sh", [
		"--skip-install",
		"--skip-deps",
		"--skip-build",
		"--platform",
		platform,
		"--out",
		binaryBuildDirectory,
	]);
	rmSync(targetDirectory, { force: true, recursive: true });
	cpSync(join(binaryBuildDirectory, platform), targetDirectory, { recursive: true });
	const archiveName = platform.startsWith("windows-") ? `adrouter-${platform}.zip` : `adrouter-${platform}.tar.gz`;
	cpSync(join(binaryBuildDirectory, archiveName), join(archiveDirectory, archiveName));
	rmSync(binaryBuildDirectory, { force: true, recursive: true });
	return platform;
}

function createAdRouterShim(installDirectory) {
	const binDirectory = join(installDirectory, "node_modules", ".bin");
	if (process.platform === "win32") {
		if (existsSync(join(binDirectory, "adrouter.cmd"))) {
			writeFileSync(join(installDirectory, "adrouter.cmd"), '@ECHO off\r\n"%~dp0node_modules\\.bin\\adrouter.cmd" %*\r\n');
			writeFileSync(join(installDirectory, "adrouter.ps1"), '& "$PSScriptRoot/node_modules/.bin/adrouter.ps1" @args\n');
			writeFileSync(
				join(installDirectory, "adrouter-profile.cmd"),
				'@ECHO off\r\n"%~dp0node_modules\\.bin\\adrouter-profile.cmd" %*\r\n',
			);
			writeFileSync(
				join(installDirectory, "adrouter-profile.ps1"),
				'& "$PSScriptRoot/node_modules/.bin/adrouter-profile.ps1" @args\n',
			);
			return;
		}
		writeFileSync(join(installDirectory, "adrouter.cmd"), '@ECHO off\r\n"%~dp0node_modules\\.bin\\adrouter.exe" %*\r\n');
		writeFileSync(join(installDirectory, "adrouter.ps1"), '& "$PSScriptRoot/node_modules/.bin/adrouter.exe" @args\n');
		writeFileSync(
			join(installDirectory, "adrouter-profile.cmd"),
			'@ECHO off\r\n"%~dp0node_modules\\.bin\\adrouter-profile.cmd" %*\r\n',
		);
		writeFileSync(
			join(installDirectory, "adrouter-profile.ps1"),
			'& "$PSScriptRoot/node_modules/.bin/adrouter-profile.cmd" @args\n',
		);
		return;
	}
	symlinkSync(join("node_modules", ".bin", "adrouter"), join(installDirectory, "adrouter"));
	symlinkSync(join("node_modules", ".bin", "adrouter-profile"), join(installDirectory, "adrouter-profile"));
}

function packPackage(pkg, tarballDirectory) {
	const packageJson = readPackageJson(pkg.directory);
	if (packageJson.name !== pkg.name) {
		throw new Error(`${pkg.directory}/package.json has name ${packageJson.name}, expected ${pkg.name}`);
	}

	const output = run("npm", ["pack", "--json", "--pack-destination", tarballDirectory], {
		capture: true,
		cwd: pkg.directory,
	});
	const packed = JSON.parse(output)[0];
	const tarball = join(tarballDirectory, packed.filename);
	assertPackageTarball(pkg, packed, tarball);
	return tarball;
}

function verifyCliTarball(tarball, sourceBundleDirectory, provenancePath) {
	const extractionDirectory = mkdtempSync(join(tmpdir(), "adrouter-cli-pack-"));
	try {
		run("tar", ["-xzf", tarball, "-C", extractionDirectory]);
		const packageDirectory = join(extractionDirectory, "package");
		compareBundledPayload(sourceBundleDirectory, join(packageDirectory, "dist", "bundled"));
		if (!readFileSync(join(packageDirectory, "BUNDLED_SOURCES.json")).equals(readFileSync(provenancePath))) {
			throw new Error("AdRouterCLI npm package has changed bundled-source provenance");
		}
	} finally {
		rmSync(extractionDirectory, { force: true, recursive: true });
	}
}

function writeChecksums(outDir, artifactPaths) {
	const entries = artifactPaths
		.map((path) => {
			const relativePath = relative(outDir, path).replaceAll("\\", "/");
			const digest = createHash("sha256").update(readFileSync(path)).digest("hex");
			return { line: `${digest}  ${relativePath}`, relativePath };
		})
		.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
	writeFileSync(join(outDir, "SHA256SUMS"), `${entries.map((entry) => entry.line).join("\n")}\n`);
}

function requireExecutable(path) {
	if (!existsSync(path)) throw new Error(`Expected executable: ${path}`);
	if (process.platform !== "win32" && (statSync(path).mode & 0o111) === 0) {
		throw new Error(`Expected executable permissions: ${path}`);
	}
}

const options = parseArgs();
const repoRoot = process.cwd();
const rootPackageJson = readPackageJson(repoRoot);

if (rootPackageJson.name !== "adroutercli-monorepo") {
	throw new Error("Run this script from the repository root");
}

const sourceBundleDirectory = join(repoRoot, "packages", "coding-agent", "bundled");
const provenancePath = join(repoRoot, "docs", "bundled-sources.json");
const packagedProvenancePath = join(repoRoot, "packages", "coding-agent", "BUNDLED_SOURCES.json");
	if (!readFileSync(provenancePath).equals(readFileSync(packagedProvenancePath))) {
	throw new Error("packages/coding-agent/BUNDLED_SOURCES.json must match docs/bundled-sources.json");
}

const needsBun = !options.skipInstall && (!options.skipBinary || !options.skipBunInstall);
if (needsBun) {
	const bunDirectory = findBunDirectory();
	childEnvironment = {
		...process.env,
		PATH: [bunDirectory, process.env.PATH].filter((entry) => entry !== undefined).join(delimiter),
	};
	console.log(`Using Bun from ${bunDirectory}`);
}

const outDir = prepareOutputDirectory(options, repoRoot);
const tarballDirectory = join(outDir, "tarballs");
const nodeInstallDirectory = join(outDir, "node");
const bunInstallDirectory = join(outDir, "bun-install");
const binaryDirectory = join(outDir, "bun");
mkdirSync(tarballDirectory, { recursive: true });
cpSync(provenancePath, join(outDir, "BUNDLED_SOURCES.json"));
cpSync(join(repoRoot, "THIRD_PARTY_NOTICES.md"), join(outDir, "THIRD_PARTY_NOTICES.md"));

if (!options.skipCheck) {
	run("npm", ["run", "check"], { cwd: repoRoot });
}

if (!options.skipTest) {
	run("./test.sh", [], { cwd: repoRoot });
}

for (const pkg of packages) {
	run("npm", ["run", "clean"], { cwd: pkg.directory });
	if (pkg.name === "@adrouter/ai") {
		run(join(repoRoot, "node_modules", ".bin", "tsgo"), ["-p", "tsconfig.build.json"], {
			cwd: pkg.directory,
		});
	} else {
		run("npm", ["run", "build"], { cwd: pkg.directory });
	}
}

const tarballs = new Map();
for (const pkg of packages) {
	const tarball = packPackage(pkg, tarballDirectory);
	tarballs.set(pkg.name, tarball);
}
verifyCliTarball(tarballs.get("@adrouter/cli"), sourceBundleDirectory, provenancePath);

let binaryPlatform;
if (!options.skipInstall) {
	if (!options.skipBinary) {
		binaryPlatform = buildBunBinaryRelease(binaryDirectory, outDir);
		compareBundledPayload(sourceBundleDirectory, join(binaryDirectory, "bundled"));
		if (!readFileSync(join(binaryDirectory, "BUNDLED_SOURCES.json")).equals(readFileSync(provenancePath))) {
			throw new Error("Standalone package has changed bundled-source provenance");
		}
		requireExecutable(join(binaryDirectory, process.platform === "win32" ? "adrouter.cmd" : "adrouter"));
		if (process.platform !== "win32") requireExecutable(join(binaryDirectory, "adrouter-bin"));
	}

	mkdirSync(nodeInstallDirectory, { recursive: true });
	const dependencies = Object.fromEntries(
		packages.map((pkg) => [pkg.name, fileSpecifier(nodeInstallDirectory, tarballs.get(pkg.name))]),
	);
	const installPackageJson = `${JSON.stringify({ private: true, dependencies, overrides: dependencies }, undefined, "\t")}\n`;
	writeFileSync(join(nodeInstallDirectory, "package.json"), installPackageJson);

	run("npm", ["install", "--omit=dev", "--ignore-scripts"], { cwd: nodeInstallDirectory });
	createAdRouterShim(nodeInstallDirectory);
	requireExecutable(join(nodeInstallDirectory, process.platform === "win32" ? "adrouter.cmd" : "adrouter"));

	if (!options.skipBunInstall) {
		mkdirSync(bunInstallDirectory, { recursive: true });
		const bunDependencies = Object.fromEntries(
			packages.map((pkg) => [pkg.name, fileSpecifier(bunInstallDirectory, tarballs.get(pkg.name))]),
		);
		writeFileSync(join(bunInstallDirectory, "package.json"), `${JSON.stringify({ private: true, dependencies: bunDependencies, overrides: bunDependencies }, undefined, "\t")}\n`);
		run("bun", ["install", "--production", "--ignore-scripts"], { cwd: bunInstallDirectory });
		createAdRouterShim(bunInstallDirectory);
		requireExecutable(join(bunInstallDirectory, process.platform === "win32" ? "adrouter.cmd" : "adrouter"));
	}
}

const checksumArtifacts = [...tarballs.values()];
if (binaryPlatform) {
	checksumArtifacts.push(
		join(outDir, `adrouter-${binaryPlatform}.${String(binaryPlatform).startsWith("windows-") ? "zip" : "tar.gz"}`),
	);
}
writeChecksums(outDir, checksumArtifacts);

console.log("\nLocal release artifacts created:");
console.log(`  ${outDir}`);
console.log(`  ${join(outDir, "BUNDLED_SOURCES.json")}`);
console.log(`  ${join(outDir, "SHA256SUMS")}`);
console.log("\nTarballs:");
for (const tarball of tarballs.values()) {
	console.log(`  ${tarball}`);
}

if (!options.skipInstall && !options.skipBinary) {
	console.log("\nLocal Bun binary release:");
	console.log(`  ${binaryDirectory}`);
	console.log(`  ${join(outDir, `adrouter-${binaryPlatform}.${String(binaryPlatform).startsWith("windows-") ? "zip" : "tar.gz"}`)}`);
	console.log("\nRun the local Bun binary release from outside the repository:");
	console.log(`  ${join(binaryDirectory, String(binaryPlatform).startsWith("windows-") ? "adrouter.cmd" : "adrouter")} --help`);

	console.log("\nIsolated npm install:");
	console.log(`  ${nodeInstallDirectory}`);
	console.log("\nRun the locally packed npm CLI from outside the repository:");
	console.log(`  ${join(nodeInstallDirectory, process.platform === "win32" ? "adrouter.cmd" : "adrouter")} --help`);

	if (!options.skipBunInstall) {
		console.log("\nIsolated Bun package install:");
		console.log(`  ${bunInstallDirectory}`);
		console.log("\nRun the locally packed Bun package CLI from outside the repository:");
		console.log(`  ${join(bunInstallDirectory, process.platform === "win32" ? "adrouter.cmd" : "adrouter")} --help`);
	}
}
