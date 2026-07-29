import { visibleWidth } from "@adrouter/tui";
import { beforeAll, describe, expect, it } from "vitest";
import type { AgentSession } from "../src/core/agent-session.ts";
import type { ReadonlyFooterDataProvider } from "../src/core/footer-data-provider.ts";
import {
	collectFooterMetrics,
	FooterComponent,
	formatCwdForFooter,
} from "../src/modes/interactive/components/footer.ts";
import { initTheme } from "../src/modes/interactive/theme/theme.ts";

type AssistantUsage = {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	cost: { total: number };
};

function createSession(options: {
	sessionName: string;
	modelId?: string;
	provider?: string;
	reasoning?: boolean;
	thinkingLevel?: string;
	usage?: AssistantUsage;
}): AgentSession {
	const usage = options.usage;
	const entries =
		usage === undefined
			? []
			: [
					{
						type: "message",
						message: {
							role: "assistant",
							usage,
						},
					},
				];

	const session = {
		state: {
			model: {
				id: options.modelId ?? "test-model",
				provider: options.provider ?? "test",
				contextWindow: 200_000,
				reasoning: options.reasoning ?? false,
			},
			thinkingLevel: options.thinkingLevel ?? "off",
		},
		sessionManager: {
			getEntries: () => entries,
			getSessionName: () => options.sessionName,
			getCwd: () => "/tmp/project",
		},
		getContextUsage: () => ({ contextWindow: 200_000, percent: 12.3 }),
		modelRegistry: {
			isUsingOAuth: () => false,
		},
	};

	return session as unknown as AgentSession;
}

function createFooterData(providerCount: number, statuses = new Map<string, string>()): ReadonlyFooterDataProvider {
	const provider = {
		getGitBranch: () => "main",
		getExtensionStatuses: () => statuses,
		getAvailableProviderCount: () => providerCount,
		onBranchChange: (callback: () => void) => {
			void callback;
			return () => {};
		},
	};

	return provider;
}

describe("formatCwdForFooter", () => {
	it("does not abbreviate sibling paths that share the home prefix", () => {
		expect(formatCwdForFooter("/home/user2", "/home/user")).toBe("/home/user2");
	});

	it("abbreviates the home directory and descendants", () => {
		expect(formatCwdForFooter("/home/user", "/home/user")).toBe("~");
		expect(formatCwdForFooter("/home/user/project", "/home/user")).toBe("~/project");
	});
});

describe("FooterComponent width handling", () => {
	beforeAll(() => {
		initTheme(undefined, false);
	});

	it("keeps all lines within width for wide session names", () => {
		const width = 93;
		const session = createSession({ sessionName: "한글".repeat(30) });
		const footer = new FooterComponent(session, createFooterData(1));

		const lines = footer.render(width);
		for (const line of lines) {
			expect(visibleWidth(line)).toBeLessThanOrEqual(width);
		}
	});

	it("keeps stats line within width for wide model and provider names", () => {
		const width = 60;
		const session = createSession({
			sessionName: "",
			modelId: "模".repeat(30),
			provider: "공급자",
			reasoning: true,
			thinkingLevel: "high",
			usage: {
				input: 12_345,
				output: 6_789,
				cacheRead: 0,
				cacheWrite: 0,
				cost: { total: 1.234 },
			},
		});
		const footer = new FooterComponent(session, createFooterData(2));

		const lines = footer.render(width);
		for (const line of lines) {
			expect(visibleWidth(line)).toBeLessThanOrEqual(width);
		}
	});

	it("uses only the pi-cache optimizer status for cache information", () => {
		const session = createSession({
			sessionName: "",
			usage: {
				input: 100,
				output: 10,
				cacheRead: 50,
				cacheWrite: 50,
				cost: { total: 0.001 },
			},
		});
		const footerData = createFooterData(
			1,
			new Map([
				["other-extension", "unrelated status"],
				["pi-cache-stats", "DeepSeek 2/3 · 0.05M/0.10M tok (50%) ⚠️ compat\n"],
			]),
		);
		const footer = new FooterComponent(session, footerData);

		expect(footer.getMetrics().cacheOptimizerStatus).toBe("DeepSeek 2/3 · 0.05M/0.10M tok (50%) ⚠️ compat");
		expect(collectFooterMetrics(session, createFooterData(1)).cacheOptimizerStatus).toBeUndefined();
		expect(footer.render(120)).toEqual([]);
	});
});
