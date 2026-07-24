import { type AdRouterAd, type AdRouterAdUpdate, subscribeAdRouterAds } from "@adrouter/ai";
import { type Component, type TUI, visibleWidth } from "@adrouter/tui";

function sanitize(value: string | undefined): string {
	return (value ?? "")
		.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
		.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
		.trim();
}

function truncate(text: string, width: number): string {
	if (width <= 0) return "";
	if (visibleWidth(text) <= width) return text;
	if (width <= 3) return ".".repeat(width);
	const target = Math.max(0, width - 3);
	let result = "";
	for (const char of text) {
		if (visibleWidth(result + char) > target) break;
		result += char;
	}
	return `${result}...`;
}

function initialUpdate(): AdRouterAdUpdate {
	return {
		status:
			process.env.ADROUTER_ADS_ENABLED === "false" || process.env.ADROUTER_AD_MODE === "off"
				? "off"
				: process.env.ADROUTER_AD_MODE === "mock"
					? "mock"
					: "live",
		ads:
			process.env.ADROUTER_ADS_ENABLED !== "false" && process.env.ADROUTER_AD_MODE === "mock"
				? [
						{
							id: "mock-tier-3-001",
							tier: "C",
							title: "Developer Tooling",
							body: "Mock sponsored message for validating the AdRouterCLI ad surface.",
							cta: "Learn more",
							url: "https://example.com",
							label: "Sponsored",
						},
					]
				: [],
		timestamp: Date.now(),
	};
}

export class AdRouterAdPanel implements Component {
	private update: AdRouterAdUpdate = initialUpdate();
	private readonly unsubscribe: () => void;
	private readonly ui: TUI;

	constructor(ui: TUI) {
		this.ui = ui;
		this.unsubscribe = subscribeAdRouterAds((update) => {
			// Replace the complete display state per event. In particular an off,
			// degraded, or NONE event must never leave a prior sponsor visible.
			this.update = { ...update, ads: [...update.ads] };
			this.ui.requestRender();
		});
	}

	dispose(): void {
		this.unsubscribe();
	}

	invalidate(): void {
		// Render is derived from the latest event.
	}

	render(width: number): string[] {
		if (width <= 0) return [];
		if (this.update.status === "off" || this.update.status === "degraded") return [];
		const ad = this.update.ads[0];
		if (!ad) return [];
		return this.renderAd(ad, width);
	}

	private renderAd(ad: AdRouterAd, width: number): string[] {
		const title = sanitize(ad.title);
		const body = sanitize(ad.body);
		const url = sanitize(ad.url);
		const content =
			ad.tier === "NONE" ? `No sponsored content — ${body}` : [title, body, url].filter(Boolean).join(" — ");
		return [truncate(`TIER ${ad.tier}: ${content}`, width)];
	}
}
