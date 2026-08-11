import { closeSync, constants, fstatSync, openSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { canonicalToolArguments, type ToolAuthorizer } from "./tool-authorization.ts";

const MAX_POLICY_BYTES = 1024 * 1024;

interface CompiledRule {
	tool: string;
	cwd: string;
	arguments: string;
	consumed: boolean;
}

function isWithin(parent: string, candidate: string): boolean {
	const child = relative(parent, candidate);
	return child === "" || (child !== ".." && !child.startsWith(`..${sep}`) && !isAbsolute(child));
}

function assertExactKeys(value: Record<string, unknown>, expected: readonly string[], label: string): void {
	const actual = Object.keys(value).sort();
	const sortedExpected = [...expected].sort();
	if (actual.length !== sortedExpected.length || actual.some((key, index) => key !== sortedExpected[index])) {
		throw new Error(`${label} must contain exactly: ${sortedExpected.join(", ")}.`);
	}
}

function parseRules(serialized: string): CompiledRule[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(serialized);
	} catch (error) {
		throw new Error(`Invalid tool policy JSON: ${error instanceof Error ? error.message : String(error)}`);
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new Error("Tool policy must be a JSON object.");
	}
	assertExactKeys(parsed as Record<string, unknown>, ["version", "rules"], "Tool policy");
	const policy = parsed as { version?: unknown; rules?: unknown };
	if (policy.version !== 1) throw new Error("Tool policy version must be 1.");
	if (!Array.isArray(policy.rules)) throw new Error("Tool policy rules must be an array.");

	return policy.rules.map((entry, index) => {
		if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
			throw new Error(`Tool policy rule ${index} must be an object.`);
		}
		assertExactKeys(entry as Record<string, unknown>, ["tool", "cwd", "arguments"], `Tool policy rule ${index}`);
		const rule = entry as { tool?: unknown; cwd?: unknown; arguments?: unknown };
		if (typeof rule.tool !== "string" || rule.tool.length === 0) {
			throw new Error(`Tool policy rule ${index} must have a non-empty tool name.`);
		}
		if (typeof rule.cwd !== "string" || !isAbsolute(rule.cwd)) {
			throw new Error(`Tool policy rule ${index} cwd must be an absolute path.`);
		}
		let cwd: string;
		try {
			cwd = realpathSync(rule.cwd);
		} catch (error) {
			throw new Error(
				`Tool policy rule ${index} cwd cannot be resolved: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
		return {
			tool: rule.tool,
			cwd,
			arguments: canonicalToolArguments(rule.arguments),
			consumed: false,
		};
	});
}

/**
 * Load an exact, one-shot authorization policy for print/JSON mode.
 *
 * The policy file itself must be an explicitly supplied absolute path outside the
 * current workspace and private to the invoking user. Rules contain no wildcard
 * syntax and are consumed after one matching call.
 */
export function loadToolPolicy(policyPath: string, workspaceCwd: string): ToolAuthorizer {
	if (process.platform === "win32") {
		throw new Error("--tool-policy is unavailable on Windows because private ACL validation is not implemented.");
	}
	if (!isAbsolute(policyPath)) throw new Error("--tool-policy requires an absolute path.");

	const requestedPath = resolve(policyPath);
	let canonicalPolicyPath: string;
	let canonicalWorkspace: string;
	try {
		canonicalPolicyPath = realpathSync(requestedPath);
		canonicalWorkspace = realpathSync(workspaceCwd);
	} catch (error) {
		throw new Error(`Cannot resolve tool policy path: ${error instanceof Error ? error.message : String(error)}`);
	}
	if (isWithin(canonicalWorkspace, canonicalPolicyPath)) {
		throw new Error("--tool-policy must be stored outside the current workspace.");
	}

	let fd: number | undefined;
	try {
		fd = openSync(requestedPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
		const metadata = fstatSync(fd);
		if (!metadata.isFile()) throw new Error("Tool policy must be a regular file.");
		if (typeof process.getuid === "function" && metadata.uid !== process.getuid()) {
			throw new Error("Tool policy must be owned by the current user.");
		}
		if ((metadata.mode & 0o077) !== 0) {
			throw new Error("Tool policy permissions must not grant group or other access (use mode 0600).");
		}
		if (metadata.size > MAX_POLICY_BYTES) throw new Error("Tool policy exceeds the 1 MiB limit.");
		const rules = parseRules(readFileSync(fd, "utf8"));

		return async (request) => {
			let requestCwd: string;
			try {
				requestCwd = realpathSync(request.cwd);
			} catch {
				return { allow: false, reason: "Tool working directory can no longer be resolved." };
			}
			const requestArguments = canonicalToolArguments(request.arguments);
			const rule = rules.find(
				(candidate) =>
					!candidate.consumed &&
					candidate.tool === request.toolName &&
					candidate.cwd === requestCwd &&
					candidate.arguments === requestArguments,
			);
			if (!rule) {
				return { allow: false, reason: "No unused exact-match tool policy rule authorizes this call." };
			}
			rule.consumed = true;
			return { allow: true };
		};
	} finally {
		if (fd !== undefined) closeSync(fd);
	}
}
