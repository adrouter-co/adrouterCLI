import assert from "node:assert";
import { describe, it } from "node:test";
import { type Component, TUI } from "../src/tui.ts";
import { VirtualTerminal } from "./virtual-terminal.ts";

class Lines implements Component {
	lines: string[];
	constructor(lines: string[]) {
		this.lines = lines;
	}
	render(): string[] {
		return this.lines;
	}
	invalidate(): void {}
}

class SelectableLines extends Lines {
	events: string[] = [];
	beginMouseSelection(row: number, col: number): boolean {
		this.events.push(`begin:${row}:${col}`);
		return true;
	}
	updateMouseSelection(row: number, col: number): boolean {
		this.events.push(`update:${row}:${col}`);
		return true;
	}
	endMouseSelection(row: number, col: number): boolean {
		this.events.push(`end:${row}:${col}`);
		return true;
	}
	clearSelection(): boolean {
		return false;
	}
}

describe("fixed transcript viewport", () => {
	it("anchors the fixed section and scrolls only session history", () => {
		const terminal = new VirtualTerminal(20, 6);
		const tui = new TUI(terminal);
		const transcript = new Lines(Array.from({ length: 8 }, (_, index) => `history-${index}`));
		const fixed = new Lines(["ad", "editor"]);
		tui.addChild(transcript);
		tui.addChild(fixed);
		tui.setBottomAnchorStart(fixed);

		assert.deepStrictEqual(tui.render(20), ["history-4", "history-5", "history-6", "history-7", "ad", "editor"]);
		tui.scrollTranscriptPage(1);
		assert.deepStrictEqual(tui.render(20), ["history-1", "history-2", "history-3", "history-4", "ad", "editor"]);
	});

	it("routes mouse drag coordinates into a selectable fixed editor", async () => {
		const terminal = new VirtualTerminal(20, 6);
		const tui = new TUI(terminal);
		const transcript = new Lines(["one", "two", "three", "four"]);
		const editor = new SelectableLines(["prompt", "status"]);
		tui.addChild(transcript);
		tui.addChild(editor);
		tui.setBottomAnchorStart(editor);
		tui.setFocus(editor);
		tui.start();
		await terminal.waitForRender();

		terminal.sendInput("\x1b[<0;2;5M");
		terminal.sendInput("\x1b[<32;4;6M");
		terminal.sendInput("\x1b[<0;4;6m");

		assert.deepStrictEqual(editor.events, ["begin:0:1", "update:1:3", "end:1:3"]);
		tui.stop();
	});

	it("lets an input listener consume PageUp before transcript scrolling", async () => {
		const terminal = new VirtualTerminal(20, 6);
		const tui = new TUI(terminal);
		const transcript = new Lines(Array.from({ length: 8 }, (_, index) => `history-${index}`));
		const fixed = new Lines(["ad", "editor"]);
		tui.addChild(transcript);
		tui.addChild(fixed);
		tui.setBottomAnchorStart(fixed);
		tui.addInputListener(() => ({ consume: true }));
		tui.start();
		await terminal.waitForRender();

		terminal.sendInput("\x1b[5~");

		assert.deepStrictEqual(tui.render(20), ["history-4", "history-5", "history-6", "history-7", "ad", "editor"]);
		tui.stop();
	});
});
