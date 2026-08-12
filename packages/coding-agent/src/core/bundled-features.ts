import { join } from "node:path";
import { VERSION } from "../config.ts";
import {
	GENERATED_BUNDLED_EXTENSION_CONTRACTS,
	GENERATED_BUNDLED_SKILL_DIRECTORIES,
	GENERATED_REQUIRED_BUNDLED_SKILLS,
} from "./bundled-manifest.generated.ts";
import type { LoadExtensionsResult } from "./extensions/types.ts";
import type { Skill } from "./skills.ts";

interface BundledExtensionContract {
	name: string;
	relativePath: readonly string[];
	commands?: readonly string[];
	tools?: readonly string[];
	handlers?: readonly string[];
	shortcuts?: readonly string[];
}

export interface BundledFeatureReport {
	mode: "required" | "disabled";
	ready: boolean;
	failures: string[];
}

export const BUNDLED_EXTENSION_CONTRACTS: readonly BundledExtensionContract[] = GENERATED_BUNDLED_EXTENSION_CONTRACTS;

export const BUNDLED_SKILL_DIRECTORIES = GENERATED_BUNDLED_SKILL_DIRECTORIES;

export const REQUIRED_BUNDLED_SKILLS = GENERATED_REQUIRED_BUNDLED_SKILLS;

export function bundledExtensionPaths(bundledRoot: string): string[] {
	return BUNDLED_EXTENSION_CONTRACTS.map(({ relativePath }) => join(bundledRoot, ...relativePath));
}

export function bundledSkillPaths(bundledRoot: string): string[] {
	return BUNDLED_SKILL_DIRECTORIES.map((relativePath) => join(bundledRoot, ...relativePath));
}

function normalizedSuffix(relativePath: readonly string[]): string {
	return `/bundled/${relativePath.join("/")}`;
}

function missingRegistrations(
	available: ReadonlySet<string>,
	required: readonly string[] | undefined,
	label: string,
): string[] {
	return (required ?? []).filter((name) => !available.has(name)).map((name) => `${label} "${name}"`);
}

export function validateBundledFeatures(
	extensionsResult: LoadExtensionsResult,
	skills: Skill[],
	enabled: boolean,
): BundledFeatureReport {
	if (!enabled) {
		return { mode: "disabled", ready: true, failures: [] };
	}

	const failures: string[] = [];
	for (const contract of BUNDLED_EXTENSION_CONTRACTS) {
		const suffix = normalizedSuffix(contract.relativePath);
		const extension = extensionsResult.extensions.find(
			(candidate) =>
				candidate.path.replaceAll("\\", "/").endsWith(suffix) ||
				candidate.resolvedPath.replaceAll("\\", "/").endsWith(suffix),
		);
		if (!extension) {
			failures.push(`${contract.name}: extension did not load`);
			continue;
		}

		const missing = [
			...missingRegistrations(new Set(extension.commands.keys()), contract.commands, "command"),
			...missingRegistrations(new Set(extension.tools.keys()), contract.tools, "tool"),
			...missingRegistrations(new Set(extension.handlers.keys()), contract.handlers, "handler"),
			...missingRegistrations(new Set(extension.shortcuts.keys()), contract.shortcuts, "shortcut"),
		];
		if (missing.length > 0) failures.push(`${contract.name}: missing ${missing.join(", ")}`);
	}

	const skillNames = new Set(skills.map(({ name }) => name));
	for (const skill of REQUIRED_BUNDLED_SKILLS) {
		if (!skillNames.has(skill)) failures.push(`bundled skill "${skill}" did not load`);
	}

	return {
		mode: "required",
		ready: failures.length === 0,
		failures,
	};
}

export function formatBundledFeatureFailure(report: BundledFeatureReport): string {
	return [
		"Bundled AdRouterCLI features are incomplete.",
		...report.failures.map((failure) => `- ${failure}`),
		`Reinstall the packaged release with: npm install -g --ignore-scripts @adrouter/cli@${VERSION}`,
		"Set ADROUTER_BUNDLED_FEATURES=off only for explicit core-only recovery.",
	].join("\n");
}
