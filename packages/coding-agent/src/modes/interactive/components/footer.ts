import type { Component } from "@adrouter/tui";
import { cumulativeAdRouterSubsidy } from "../../../core/adrouter-session.ts";
import type { AgentSession } from "../../../core/agent-session.ts";
import type { ReadonlyFooterDataProvider } from "../../../core/footer-data-provider.ts";
import { formatDisplayDirectory } from "./path-display.ts";

const PI_CACHE_OPTIMIZER_STATUS_KEY = "pi-cache-stats";

/** Values rendered around the default input panel. */
export interface FooterMetrics {
	cwd: string;
	gitBranch?: string;
	sessionName?: string;
	providerLabel: string;
	modelLabel: string;
	thinkingLabel: string;
	contextTokens: number | null;
	contextWindow: number;
	cacheOptimizerStatus?: string;
	totalCost: number;
	totalSubsidy: number;
	effectiveCost: number;
	autoCompactEnabled: boolean;
}

/**
 * Sanitize text for display in a single-line status.
 * Removes newlines, tabs, carriage returns, and other control characters.
 */
function sanitizeStatusText(text: string): string {
	// Replace newlines, tabs, carriage returns with space, then collapse multiple spaces
	return text
		.replace(/[\r\n\t]/g, " ")
		.replace(/ +/g, " ")
		.trim();
}

/**
 * Format token counts for compact footer display.
 */
export function formatTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1000000) return `${Math.round(count / 1000)}k`;
	if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
	return `${Math.round(count / 1000000)}M`;
}

export function formatCwdForFooter(cwd: string, home: string | undefined): string {
	return formatDisplayDirectory(cwd, home);
}

/** Collect cumulative session values once for the input panel and its tests. */
export function collectFooterMetrics(
	session: AgentSession,
	footerData: ReadonlyFooterDataProvider,
	autoCompactEnabled = true,
): FooterMetrics {
	let totalCost = 0;

	const entries = session.sessionManager.getEntries();
	for (const entry of entries) {
		if (entry.type !== "message" || entry.message.role !== "assistant") continue;
		const usage = entry.message.usage;
		totalCost += usage.cost.total;
	}

	const totalSubsidy = Math.max(0, cumulativeAdRouterSubsidy(entries));
	const contextUsage = session.getContextUsage();
	const model = session.state.model;

	return {
		cwd: formatCwdForFooter(session.sessionManager.getCwd(), process.env.HOME || process.env.USERPROFILE),
		gitBranch: footerData.getGitBranch() || undefined,
		sessionName: session.sessionManager.getSessionName() || undefined,
		providerLabel: model?.provider || "no-provider",
		modelLabel: model?.id || "no-model",
		thinkingLabel: session.state.thinkingLevel || "off",
		contextTokens: contextUsage?.tokens ?? null,
		contextWindow: contextUsage?.contextWindow ?? model?.contextWindow ?? 0,
		cacheOptimizerStatus: footerData.getExtensionStatuses().get(PI_CACHE_OPTIMIZER_STATUS_KEY)
			? sanitizeStatusText(footerData.getExtensionStatuses().get(PI_CACHE_OPTIMIZER_STATUS_KEY)!)
			: undefined,
		totalCost,
		totalSubsidy,
		effectiveCost: Math.max(0, totalCost - totalSubsidy),
		autoCompactEnabled,
	};
}

/**
 * Footer component that shows pwd, token stats, and context usage.
 * Computes token/context stats from session, gets git branch and extension statuses from provider.
 */
export class FooterComponent implements Component {
	private autoCompactEnabled = true;
	private session: AgentSession;
	private footerData: ReadonlyFooterDataProvider;

	constructor(session: AgentSession, footerData: ReadonlyFooterDataProvider) {
		this.session = session;
		this.footerData = footerData;
	}

	setSession(session: AgentSession): void {
		this.session = session;
	}

	setAutoCompactEnabled(enabled: boolean): void {
		this.autoCompactEnabled = enabled;
	}

	getMetrics(): FooterMetrics {
		return collectFooterMetrics(this.session, this.footerData, this.autoCompactEnabled);
	}

	/**
	 * No-op: git branch caching now handled by provider.
	 * Kept for compatibility with existing call sites in interactive-mode.
	 */
	invalidate(): void {
		// No-op: git branch is cached/invalidated by provider
	}

	/**
	 * Clean up resources.
	 * Git watcher cleanup now handled by provider.
	 */
	dispose(): void {
		// Git watcher cleanup handled by provider
	}

	render(_width: number): string[] {
		return [];
	}
}
