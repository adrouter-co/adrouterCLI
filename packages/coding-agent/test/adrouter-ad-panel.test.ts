import { publishAdRouterAds } from "@adrouter/ai";
import type { TUI } from "@adrouter/tui";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AdRouterAdPanel } from "../src/modes/interactive/components/adrouter-ad-panel.ts";
import { initTheme } from "../src/modes/interactive/theme/theme.ts";
import { stripAnsi } from "../src/utils/ansi.ts";

describe("AdRouterAdPanel", () => {
	beforeAll(() => {
		initTheme(undefined, false);
	});

	afterEach(() => {
		delete process.env.ADROUTER_MIN_AD_TIER;
		publishAdRouterAds({ status: "off", ads: [] });
		vi.restoreAllMocks();
	});

	it("renders high-priority live ads with the default minimum tier", () => {
		const tui = { requestRender: vi.fn() } as unknown as TUI;
		const panel = new AdRouterAdPanel(tui);

		publishAdRouterAds({
			status: "live",
			ads: [
				{
					id: "ad-1",
					tier: "A",
					title: "Compiler Cloud",
					body: "Fast build minutes for coding agents.",
					label: "Sponsored",
				},
			],
		});

		const rendered = stripAnsi(panel.render(80).join("\n"));

		expect(rendered).toContain("Compiler Cloud");
		expect(rendered).toContain("Fast build minutes");
		expect(tui.requestRender).toHaveBeenCalled();

		panel.dispose();
	});

	it("renders Tier NONE in the same one-line format", () => {
		const tui = { requestRender: vi.fn() } as unknown as TUI;
		const panel = new AdRouterAdPanel(tui);

		publishAdRouterAds({
			status: "live",
			ads: [
				{
					id: "ad-3",
					tier: "NONE",
					title: "No sponsored content",
					body: "Sensitive category detected.",
					label: "TIER NONE",
				},
			],
		});

		expect(stripAnsi(panel.render(80).join("\n")).trimEnd()).toBe(
			"TIER NONE: No sponsored content — Sensitive category detected.",
		);

		panel.dispose();
	});

	it("keeps privacy-protected NONE visible but clears opt-out", () => {
		const tui = { requestRender: vi.fn() } as unknown as TUI;
		const panel = new AdRouterAdPanel(tui);

		publishAdRouterAds({
			status: "privacy_protected",
			ads: [
				{
					id: "guardrail",
					tier: "NONE",
					title: "No sponsored content",
					body: "Sensitive category detected.",
					label: "TIER NONE",
				},
			],
		});
		expect(stripAnsi(panel.render(80).join("\n"))).toContain("TIER NONE: No sponsored content");

		publishAdRouterAds({ status: "off", ads: [] });
		expect(panel.render(80)).toEqual([]);
		panel.dispose();
	});

	it("atomically replaces a sponsor with the latest outcome and clears degraded state", () => {
		const tui = { requestRender: vi.fn() } as unknown as TUI;
		const panel = new AdRouterAdPanel(tui);

		publishAdRouterAds({
			status: "live",
			ads: [
				{
					id: "home-depot",
					tier: "A",
					title: "Home Depot",
					body: "Pipe repair supplies",
					url: "https://homedepot.com",
					label: "Sponsored",
				},
			],
		});
		publishAdRouterAds({
			status: "live",
			ads: [
				{
					id: "expedia",
					tier: "B",
					title: "Expedia",
					body: "December travel deals",
					url: "https://expedia.com",
					label: "Sponsored",
				},
			],
		});

		const replacement = stripAnsi(panel.render(80).join("\n"));
		expect(replacement).toContain("Expedia");
		expect(replacement).not.toContain("Home Depot");

		publishAdRouterAds({
			status: "live",
			ads: [
				{
					id: "none",
					tier: "NONE",
					title: "No sponsored content",
					body: "Sensitive category detected.",
					label: "TIER NONE",
				},
			],
		});
		expect(stripAnsi(panel.render(80).join("\n"))).toContain("TIER NONE: No sponsored content");
		expect(stripAnsi(panel.render(80).join("\n"))).not.toContain("Expedia");

		publishAdRouterAds({ status: "degraded", ads: [] });
		expect(panel.render(80)).toEqual([]);
		panel.dispose();
	});

	it("keeps the exact display family on narrow terminals", () => {
		const tui = { requestRender: vi.fn() } as unknown as TUI;
		const panel = new AdRouterAdPanel(tui);
		publishAdRouterAds({
			status: "live",
			ads: [
				{
					id: "narrow",
					tier: "C",
					title: "A very long brand",
					body: "A very long sponsored message",
					url: "https://example.com",
					label: "Sponsored",
				},
			],
		});
		const rendered = stripAnsi(panel.render(22).join("\n"));
		expect(rendered).toMatch(/^TIER C: /);
		expect(rendered.length).toBeLessThanOrEqual(22);
		panel.dispose();
	});

	it("never exceeds extremely narrow terminal widths", () => {
		const tui = { requestRender: vi.fn() } as unknown as TUI;
		const panel = new AdRouterAdPanel(tui);
		publishAdRouterAds({
			status: "live",
			ads: [{ id: "tiny", tier: "C", title: "Brand", body: "Copy", label: "Sponsored" }],
		});

		expect(panel.render(0)).toEqual([]);
		for (const width of [1, 2, 3]) {
			expect(stripAnsi(panel.render(width).join(""))).toHaveLength(width);
		}
		panel.dispose();
	});
});
