import { createHash, randomUUID } from "node:crypto";
import type { ToolAuthorizationContext } from "@adrouter/agent-core";

export interface ToolApprovalRequest {
	version: 1;
	approvalId: string;
	digest: string;
	sessionId: string;
	toolCallId: string;
	toolName: string;
	effect: "mutation" | "command";
	cwd: string;
	arguments: unknown;
}

export type ToolAuthorizer = (
	request: ToolApprovalRequest,
	signal?: AbortSignal,
) => Promise<{ allow: boolean; reason?: string }>;

function canonicalize(value: unknown, seen = new Set<object>()): unknown {
	if (value === null || typeof value === "string" || typeof value === "boolean") return value;
	if (typeof value === "number") {
		if (!Number.isFinite(value)) throw new Error("Tool approval arguments must contain finite numbers.");
		return value;
	}
	if (Array.isArray(value)) return value.map((entry) => canonicalize(entry, seen));
	if (typeof value !== "object") throw new Error("Tool approval arguments must be JSON-compatible.");
	if (seen.has(value)) throw new Error("Tool approval arguments cannot contain cycles.");
	seen.add(value);
	const result: Record<string, unknown> = {};
	for (const key of Object.keys(value as Record<string, unknown>).sort()) {
		const entry = (value as Record<string, unknown>)[key];
		if (entry !== undefined) result[key] = canonicalize(entry, seen);
	}
	seen.delete(value);
	return result;
}

export function canonicalToolArguments(value: unknown): string {
	return JSON.stringify(canonicalize(value));
}

export function createToolApprovalRequest(
	sessionId: string,
	cwd: string,
	context: ToolAuthorizationContext,
): ToolApprovalRequest {
	if (context.effect === "read") throw new Error("Read-only tools do not require approval.");
	const canonicalArguments = canonicalToolArguments(context.args);
	const binding = JSON.stringify({
		version: 1,
		sessionId,
		toolCallId: context.toolCall.id,
		toolName: context.toolCall.name,
		cwd,
		arguments: JSON.parse(canonicalArguments) as unknown,
	});
	return {
		version: 1,
		approvalId: randomUUID(),
		digest: `sha256:${createHash("sha256").update(binding).digest("hex")}`,
		sessionId,
		toolCallId: context.toolCall.id,
		toolName: context.toolCall.name,
		effect: context.effect,
		cwd,
		arguments: context.args,
	};
}

export function formatToolApproval(request: ToolApprovalRequest): string {
	const serialized = JSON.stringify(request.arguments, null, 2);
	const maximum = 4_000;
	const display = serialized.length > maximum ? `${serialized.slice(0, maximum)}\n…` : serialized;
	return `Tool: ${request.toolName}\nWorking directory: ${request.cwd}\nExact arguments:\n${display}`;
}
