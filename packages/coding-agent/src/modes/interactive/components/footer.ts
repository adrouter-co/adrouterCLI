import { isAbsolute, relative, resolve, sep } from "node:path";
import { type Component, truncateToWidth } from "@adrouter/tui";
import { cumulativeAdRouterSubsidy } from "../../../core/adrouter-session.ts";
import type { AgentSession } from "../../../core/agent-session.ts";
import { areExperimentalFeaturesEnabled } from "../../../core/experimental.ts";
import type { ReadonlyFooterDataProvider } from "../../../core/footer-data-provider.ts";
import { theme } from "../theme/theme.ts";

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
	cacheHitRate: number;
	totalCost: number;
	totalSubsidy: number;
	effectiveCost: number;
	autoCompactEnabled: boolean;
}

/**
 * Sanitize extension-provided text for a single-line status continuation.
 */
function sanitizeStatusText(text: string): string {
	return text
		.replace(/[\r\n\t]/g, " ")
		.replace(/ +/g, " ")
		.trim();
}

/** Format token counts for compact footer display. */
export function formatTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1000000) return `${Math.round(count / 1000)}k`;
	if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
	return `${Math.round(count / 1000000)}M`;
}

export function formatCwdForFooter(cwd: string, home: string | undefined): string {
	if (!home) return cwd;

	const resolvedCwd = resolve(cwd);
	const resolvedHome = resolve(home);
	const relativeToHome = relative(resolvedHome, resolvedCwd);
	const isInsideHome =
		relativeToHome === "" ||
		(relativeToHome !== ".." && !relativeToHome.startsWith(`..${sep}`) && !isAbsolute(relativeToHome));

	if (!isInsideHome) return cwd;
	return relativeToHome === "" ? "~" : `~/${relativeToHome.split(sep).join("/")}`;
}

/** Collect cumulative session values once for the input panel and its tests. */
export function collectFooterMetrics(
	session: AgentSession,
	footerData: ReadonlyFooterDataProvider,
	autoCompactEnabled = true,
): FooterMetrics {
	let totalPromptTokens = 0;
	let totalCacheRead = 0;
	let totalCost = 0;

	const entries = session.sessionManager.getEntries();
	for (const entry of entries) {
		if (entry.type !== "message" || entry.message.role !== "assistant") continue;
		const usage = entry.message.usage;
		totalPromptTokens += usage.input + usage.cacheRead + usage.cacheWrite;
		totalCacheRead += usage.cacheRead;
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
		cacheHitRate: totalPromptTokens > 0 ? (totalCacheRead / totalPromptTokens) * 100 : 0,
		totalCost,
		totalSubsidy,
		effectiveCost: Math.max(0, totalCost - totalSubsidy),
		autoCompactEnabled,
	};
}

/**
 * Built-in footer. Session accounting now lives directly on the input panel;
 * this component remains as a dim continuation line for extension status text.
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

	invalidate(): void {
		// Git branch caching and invalidation are owned by FooterDataProvider.
	}

	dispose(): void {
		// Git watcher cleanup is owned by FooterDataProvider.
	}

	render(width: number): string[] {
		if (width <= 0) return [];
		const statusParts = Array.from(this.footerData.getExtensionStatuses().entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([, text]) => sanitizeStatusText(text))
			.filter(Boolean);
		if (areExperimentalFeaturesEnabled()) {
			statusParts.push(`${theme.fg("dim", "•")} ${theme.bold(theme.fg("warning", "xp"))}`);
		}
		if (statusParts.length === 0) return [];
		return [truncateToWidth(theme.fg("dim", statusParts.join("  ")), width, theme.fg("dim", "..."))];
	}
}
