import { TUI, visibleWidth } from "@adrouter/tui";
import { beforeAll, describe, expect, it } from "vitest";
import { KeybindingsManager } from "../src/core/keybindings.ts";
import { CustomEditor } from "../src/modes/interactive/components/custom-editor.ts";
import { getEditorTheme, initTheme } from "../src/modes/interactive/theme/theme.ts";
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
			sessionName: "demo",
			profileName: "deepseek-live",
			modeLabel: "AdRouterCLI",
			modelLabel: "deepseek-v4-flash",
			thinkingLabel: "high",
		}));

		const lines = editor.render(80);
		const plain = lines.map(stripAnsi);

		expect(plain[0]).toContain("/tmp/project · demo");
		expect(plain[0]).toContain("deepseek-live");
		expect(plain.some((line) => line.includes("Ask anything..."))).toBe(true);
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
	});
});
