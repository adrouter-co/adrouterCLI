export {
	type BashOperations,
	type BashSpawnContext,
	type BashSpawnHook,
	type BashToolDetails,
	type BashToolInput,
	type BashToolOptions,
	createBashTool,
	createBashToolDefinition,
	createLocalBashOperations,
} from "./bash.ts";
export {
	createEditTool,
	createEditToolDefinition,
	type EditOperations,
	type EditToolDetails,
	type EditToolInput,
	type EditToolOptions,
} from "./edit.ts";
export { withFileMutationQueue } from "./file-mutation-queue.ts";
export {
	createFindTool,
	createFindToolDefinition,
	type FindOperations,
	type FindToolDetails,
	type FindToolInput,
	type FindToolOptions,
} from "./find.ts";
export {
	createGrepTool,
	createGrepToolDefinition,
	type GrepOperations,
	type GrepToolDetails,
	type GrepToolInput,
	type GrepToolOptions,
} from "./grep.ts";
export {
	createLsTool,
	createLsToolDefinition,
	type LsOperations,
	type LsToolDetails,
	type LsToolInput,
	type LsToolOptions,
} from "./ls.ts";
export {
	createReadTool,
	createReadToolDefinition,
	type ReadOperations,
	type ReadToolDetails,
	type ReadToolInput,
	type ReadToolOptions,
} from "./read.ts";
export {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	formatSize,
	type TruncationOptions,
	type TruncationResult,
	truncateHead,
	truncateLine,
	truncateTail,
} from "./truncate.ts";
export {
	createWriteTool,
	createWriteToolDefinition,
	type WriteOperations,
	type WriteToolInput,
	type WriteToolOptions,
} from "./write.ts";

import type { AgentTool, ToolEffect } from "@adrouter/agent-core";
import type { ToolDefinition } from "../extensions/types.ts";
import { type BashToolOptions, createBashTool, createBashToolDefinition } from "./bash.ts";
import { createEditTool, createEditToolDefinition, type EditToolOptions } from "./edit.ts";
import { createFindTool, createFindToolDefinition, type FindToolOptions } from "./find.ts";
import { createGrepTool, createGrepToolDefinition, type GrepToolOptions } from "./grep.ts";
import { createLsTool, createLsToolDefinition, type LsToolOptions } from "./ls.ts";
import { createReadTool, createReadToolDefinition, type ReadToolOptions } from "./read.ts";
import { createWriteTool, createWriteToolDefinition, type WriteToolOptions } from "./write.ts";

export type Tool = AgentTool<any>;
export type ToolDef = ToolDefinition<any, any>;
export type ToolName = "read" | "bash" | "edit" | "write" | "grep" | "find" | "ls";
export const allToolNames: Set<ToolName> = new Set(["read", "bash", "edit", "write", "grep", "find", "ls"]);

export interface ToolsOptions {
	read?: ReadToolOptions;
	bash?: BashToolOptions;
	write?: WriteToolOptions;
	edit?: EditToolOptions;
	grep?: GrepToolOptions;
	find?: FindToolOptions;
	ls?: LsToolOptions;
}

const TOOL_EFFECTS: Record<ToolName, ToolEffect> = {
	read: "read",
	bash: "command",
	edit: "mutation",
	write: "mutation",
	grep: "read",
	find: "read",
	ls: "read",
};

function classified(definition: ToolDef, toolName: ToolName): ToolDef {
	return { ...definition, effect: TOOL_EFFECTS[toolName] };
}

function classifiedTool(tool: Tool, toolName: ToolName): Tool {
	return { ...tool, effect: TOOL_EFFECTS[toolName] };
}

export function createToolDefinition(toolName: ToolName, cwd: string, options?: ToolsOptions): ToolDef {
	switch (toolName) {
		case "read":
			return classified(createReadToolDefinition(cwd, options?.read), toolName);
		case "bash":
			return classified(createBashToolDefinition(cwd, options?.bash), toolName);
		case "edit":
			return classified(createEditToolDefinition(cwd, options?.edit), toolName);
		case "write":
			return classified(createWriteToolDefinition(cwd, options?.write), toolName);
		case "grep":
			return classified(createGrepToolDefinition(cwd, options?.grep), toolName);
		case "find":
			return classified(createFindToolDefinition(cwd, options?.find), toolName);
		case "ls":
			return classified(createLsToolDefinition(cwd, options?.ls), toolName);
		default:
			throw new Error(`Unknown tool name: ${toolName}`);
	}
}

export function createTool(toolName: ToolName, cwd: string, options?: ToolsOptions): Tool {
	switch (toolName) {
		case "read":
			return classifiedTool(createReadTool(cwd, options?.read), toolName);
		case "bash":
			return classifiedTool(createBashTool(cwd, options?.bash), toolName);
		case "edit":
			return classifiedTool(createEditTool(cwd, options?.edit), toolName);
		case "write":
			return classifiedTool(createWriteTool(cwd, options?.write), toolName);
		case "grep":
			return classifiedTool(createGrepTool(cwd, options?.grep), toolName);
		case "find":
			return classifiedTool(createFindTool(cwd, options?.find), toolName);
		case "ls":
			return classifiedTool(createLsTool(cwd, options?.ls), toolName);
		default:
			throw new Error(`Unknown tool name: ${toolName}`);
	}
}

export function createCodingToolDefinitions(cwd: string, options?: ToolsOptions): ToolDef[] {
	return [
		createToolDefinition("read", cwd, options),
		createToolDefinition("bash", cwd, options),
		createToolDefinition("edit", cwd, options),
		createToolDefinition("write", cwd, options),
	];
}

export function createReadOnlyToolDefinitions(cwd: string, options?: ToolsOptions): ToolDef[] {
	return [
		createToolDefinition("read", cwd, options),
		createToolDefinition("grep", cwd, options),
		createToolDefinition("find", cwd, options),
		createToolDefinition("ls", cwd, options),
	];
}

export function createAllToolDefinitions(cwd: string, options?: ToolsOptions): Record<ToolName, ToolDef> {
	return {
		read: createToolDefinition("read", cwd, options),
		bash: createToolDefinition("bash", cwd, options),
		edit: createToolDefinition("edit", cwd, options),
		write: createToolDefinition("write", cwd, options),
		grep: createToolDefinition("grep", cwd, options),
		find: createToolDefinition("find", cwd, options),
		ls: createToolDefinition("ls", cwd, options),
	};
}

export function createCodingTools(cwd: string, options?: ToolsOptions): Tool[] {
	return [
		createTool("read", cwd, options),
		createTool("bash", cwd, options),
		createTool("edit", cwd, options),
		createTool("write", cwd, options),
	];
}

export function createReadOnlyTools(cwd: string, options?: ToolsOptions): Tool[] {
	return [
		createTool("read", cwd, options),
		createTool("grep", cwd, options),
		createTool("find", cwd, options),
		createTool("ls", cwd, options),
	];
}

export function createAllTools(cwd: string, options?: ToolsOptions): Record<ToolName, Tool> {
	return {
		read: createTool("read", cwd, options),
		bash: createTool("bash", cwd, options),
		edit: createTool("edit", cwd, options),
		write: createTool("write", cwd, options),
		grep: createTool("grep", cwd, options),
		find: createTool("find", cwd, options),
		ls: createTool("ls", cwd, options),
	};
}
