import { publishAdRouterAds } from "@adrouter/ai";
import { type TUI, visibleWidth } from "@adrouter/tui";
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

	it("renders Tier NONE as a three-line structured banner", () => {
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

		expect(panel.render(80).map(stripAnsi)).toEqual([
			"No sponsored content",
			"TIER NONE",
			"Sensitive category detected.",
		]);

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
		expect(panel.render(80).map(stripAnsi)).toEqual([
			"No sponsored content",
			"TIER NONE",
			"Sensitive category detected.",
		]);

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
		expect(panel.render(80).map(stripAnsi)[0]).toBe("No sponsored content");
		expect(panel.render(80).map(stripAnsi)[1]).toBe("TIER NONE");
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
		const rendered = panel.render(22).map(stripAnsi);
		expect(rendered[0]).toBe("A very long brand");
		expect(rendered[1]).toBe("TIER C · Sponsored");
		expect(rendered.length).toBeGreaterThanOrEqual(3);
		expect(rendered.length).toBeLessThanOrEqual(5);
		expect(rendered.every((line) => line.length <= 22)).toBe(true);
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
			const lines = panel.render(width).map(stripAnsi);
			expect(lines.length).toBeGreaterThanOrEqual(3);
			expect(lines.length).toBeLessThanOrEqual(5);
			expect(lines.every((line) => visibleWidth(line) <= width)).toBe(true);
		}
		panel.dispose();
	});
});
