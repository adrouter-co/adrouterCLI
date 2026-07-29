import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TUI, visibleWidth } from "@adrouter/tui";
import { beforeAll, describe, expect, it } from "vitest";
import { KeybindingsManager } from "../src/core/keybindings.ts";
import { CustomEditor } from "../src/modes/interactive/components/custom-editor.ts";
import { getEditorTheme, initTheme, loadThemeFromPath } from "../src/modes/interactive/theme/theme.ts";
import { stripAnsi } from "../src/utils/ansi.ts";

function createTui(): TUI {
	return new TUI({ columns: 80, rows: 24 } as TUI["terminal"]);
}

describe("CustomEditor OpenCode panel", () => {
	beforeAll(() => initTheme(undefined, false));

	it("renders a filled panel with profile and prompt metadata", () => {
		const editor = new CustomEditor(createTui(), getEditorTheme(), KeybindingsManager.create());
		editor.setMetadataProvider(() => ({
			cwd: "/tmp/project",
			branch: "feature/tui-refresh",
			sessionName: "demo",
			profileName: "deepseek-live",
			modeLabel: "AdRouterCLI",
			modelLabel: "deepseek-v4-flash",
			providerLabel: "adrouter",
			thinkingLabel: "high",
			contextTokens: 24_600,
			contextWindow: 200_000,
			cacheOptimizerStatus: "DeepSeek 2/3 · 0.05M/0.10M tok (50%) ⚠️ compat",
			totalCost: 1.234,
			totalSubsidy: 0.234,
			effectiveCost: 1,
			autoCompactEnabled: true,
		}));

		const lines = editor.render(80);
		const plain = lines.map(stripAnsi);

		expect(plain[0]).toContain("/tmp/project");
		expect(plain[0]).toContain("feature/tui-refresh");
		expect(plain[0]).toContain("demo  │  deepseek-live");
		expect(plain[0]).not.toContain("Session:");
		expect(plain[0]).not.toContain("Profile:");
		expect(plain[0]).toContain("deepseek-live");
		expect(plain.some((line) => line.includes("Ask anything..."))).toBe(true);
		expect(plain.some((line) => /^▄+$/.test(line))).toBe(true);
		expect(plain.some((line) => /^▀+$/.test(line))).toBe(true);
		expect(plain.join("\n")).not.toContain("[Esc] Interrupt");
		expect(plain.join("\n")).not.toContain("[/] Commands");
		expect(plain.join("\n")).toContain("ctx 25k/200k auto");
		expect(plain.join("\n")).toContain("adrouter · deepseek-v4-flash · thinking high");
		expect(plain.join("\n")).toContain("Σ$1.234 · +$0.234 · =$1.000");
		expect(plain.join("\n")).toContain("DeepSeek 2/3 · 0.05M/0.10M tok (50%) ⚠️ compat");
		expect(plain.slice(-2).every((line) => !line.includes("─"))).toBe(true);
		const lowerPanelEdge = plain.findIndex((line) => /^▀+$/.test(line));
		expect(lowerPanelEdge).toBeGreaterThanOrEqual(0);
		expect(plain).toHaveLength(lowerPanelEdge + 3);
		expect(lines.some((line) => line.includes("\x1b[48"))).toBe(true);
		expect(lines.every((line) => visibleWidth(line) <= 80)).toBe(true);
	});

	it("keeps every row within a narrow terminal", () => {
		const editor = new CustomEditor(createTui(), getEditorTheme(), KeybindingsManager.create());
		editor.setMetadataProvider(() => ({
			cwd: "/a/very/long/workspace/path",
			sessionName: "a-very-long-session-name",
			profileName: "profile-name",
			modeLabel: "AdRouterCLI",
			modelLabel: "deepseek-v4-flash",
		}));

		expect(editor.render(24).every((line) => visibleWidth(line) <= 24)).toBe(true);
		const plain = editor.render(24).map(stripAnsi).join("\n");
		expect(plain).not.toContain("Session:");
		expect(plain).not.toContain("Profile:");
		expect(plain).not.toContain("─");
		expect(plain).not.toContain("Commands");
	});

	it("uses the approved dark grayscale progression as the input panel background", () => {
		const currentDir = dirname(fileURLToPath(import.meta.url));
		const darkTheme = loadThemeFromPath(join(currentDir, "../src/modes/interactive/theme/dark.json"), "truecolor");
		const expected = {
			off: "35;35;35",
			minimal: "35;35;35",
			low: "35;35;35",
			medium: "52;52;52",
			high: "70;70;70",
			xhigh: "87;87;87",
			max: "87;87;87",
		} as const;

		for (const [level, rgb] of Object.entries(expected)) {
			const editorTheme = {
				...getEditorTheme(),
				borderColor: darkTheme.getThinkingBorderColor(level as keyof typeof expected),
			};
			const editor = new CustomEditor(createTui(), editorTheme, KeybindingsManager.create());
			const rendered = editor.render(40).join("\n");
			expect(rendered).toContain(`\x1b[48;2;${rgb}m`);
		}
	});
});
