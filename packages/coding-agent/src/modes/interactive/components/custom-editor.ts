import {
	CURSOR_MARKER,
	Editor,
	type EditorOptions,
	type EditorTheme,
	type TUI,
	truncateToWidth,
	visibleWidth,
} from "@adrouter/tui";
import type { AppKeybinding, KeybindingsManager } from "../../../core/keybindings.ts";
import { theme as uiTheme } from "../theme/theme.ts";

export interface EditorMetadata {
	cwd?: string;
	sessionName?: string;
	profileName?: string;
	modeLabel?: string;
	modelLabel?: string;
	providerLabel?: string;
	thinkingLabel?: string;
	rightLabel?: string;
}

/**
 * Custom editor that handles app-level keybindings for coding-agent.
 */
export class CustomEditor extends Editor {
	private keybindings: KeybindingsManager;
	private metadataProvider: (() => EditorMetadata) | undefined;
	public actionHandlers: Map<AppKeybinding, () => void> = new Map();

	// Special handlers that can be dynamically replaced
	public onEscape?: () => void;
	public onCtrlD?: () => void;
	public onPasteImage?: () => void;
	/** Handler for extension-registered shortcuts. Returns true if handled. */
	public onExtensionShortcut?: (data: string) => boolean;

	constructor(tui: TUI, theme: EditorTheme, keybindings: KeybindingsManager, options?: EditorOptions) {
		super(tui, theme, options);
		this.keybindings = keybindings;
	}

	/**
	 * Register a handler for an app action.
	 */
	onAction(action: AppKeybinding, handler: () => void): void {
		this.actionHandlers.set(action, handler);
	}

	setMetadataProvider(provider: (() => EditorMetadata) | undefined): void {
		this.metadataProvider = provider;
	}

	override render(width: number): string[] {
		if (width <= 0) return [];
		const meta = this.metadataProvider?.() ?? {};
		const panelWidth = Math.max(1, width);
		const padX = Math.min(2, Math.max(0, Math.floor((panelWidth - 1) / 2)));
		const layoutWidth = Math.max(1, panelWidth - padX * 2);
		this.lastWidth = layoutWidth;
		const layoutLines = this.layoutText(layoutWidth);
		const maxVisibleLines = Math.max(5, Math.floor(this.tui.terminal.rows * 0.3));
		let cursorLineIndex = layoutLines.findIndex((line) => line.hasCursor);
		if (cursorLineIndex === -1) cursorLineIndex = 0;
		if (cursorLineIndex < this.scrollOffset) {
			this.scrollOffset = cursorLineIndex;
		} else if (cursorLineIndex >= this.scrollOffset + maxVisibleLines) {
			this.scrollOffset = cursorLineIndex - maxVisibleLines + 1;
		}
		this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, Math.max(0, layoutLines.length - maxVisibleLines)));
		const visibleLines = layoutLines.slice(this.scrollOffset, this.scrollOffset + maxVisibleLines);
		const result: string[] = [];

		const left = [meta.cwd, meta.sessionName].filter(Boolean).join(" · ");
		const right = meta.profileName || "no profile loaded";
		result.push(this.renderSplitLine(left, right, width));

		const foregroundSample = this.borderColor("");
		const foreground = foregroundSample.match(/\x1b\[38[^m]*m/)?.[0];
		const panelBackground = foreground?.replace("38", "48") ?? "";
		const restorePanelBackground = (text: string): string =>
			panelBackground ? text.replace(/\x1b\[(?:0|27|49)m/g, (reset) => `${reset}${panelBackground}`) : text;
		const makePanelLine = (content: string): string => {
			const clipped = restorePanelBackground(truncateToWidth(content, panelWidth, ""));
			const padded = clipped + " ".repeat(Math.max(0, panelWidth - visibleWidth(clipped)));
			return panelBackground ? `${panelBackground}${padded}\x1b[49m` : padded;
		};

		if (this.scrollOffset > 0) {
			result.push(makePanelLine(uiTheme.fg("dim", ` ↑ ${this.scrollOffset} more`)));
		}
		this.lastVisibleLayoutLines = visibleLines;
		this.lastPaddingX = padX;
		this.lastTextRowStart = result.length;
		const hasSelection = this.getOrderedSelection() !== undefined;
		const isEmpty = this.getText().length === 0;
		const placeholder = meta.modeLabel === "Shell" ? "Run a command..." : "Ask anything...";
		for (const layoutLine of visibleLines) {
			let displayText = this.styleSelectionInLayoutLine(
				layoutLine.text,
				layoutLine.logicalLine,
				layoutLine.startCol,
				layoutLine.endCol,
				layoutLine.cursorPos,
				hasSelection && this.focused && layoutLine.hasCursor,
			);
			let lineWidth = visibleWidth(layoutLine.text);
			if (isEmpty && layoutLine.hasCursor) {
				const marker = this.focused ? CURSOR_MARKER : "";
				displayText = `${marker}\x1b[7m \x1b[27m${uiTheme.fg("dim", placeholder)}`;
				lineWidth = 1 + visibleWidth(placeholder);
			} else if (!hasSelection && layoutLine.hasCursor && layoutLine.cursorPos !== undefined) {
				const before = layoutLine.text.slice(0, layoutLine.cursorPos);
				const after = layoutLine.text.slice(layoutLine.cursorPos);
				const marker = this.focused ? CURSOR_MARKER : "";
				if (after) {
					const grapheme = [...this.segment(after, "grapheme")][0]?.segment ?? "";
					displayText = `${before}${marker}\x1b[7m${grapheme}\x1b[27m${after.slice(grapheme.length)}`;
				} else {
					displayText = `${before}${marker}\x1b[7m \x1b[27m`;
					lineWidth += 1;
				}
			}
			const padding = " ".repeat(Math.max(0, layoutWidth - lineWidth));
			result.push(makePanelLine(`${" ".repeat(padX)}${displayText}${padding}${" ".repeat(padX)}`));
		}

		const linesBelow = layoutLines.length - (this.scrollOffset + visibleLines.length);
		if (linesBelow > 0) {
			result.push(makePanelLine(uiTheme.fg("dim", ` ↓ ${linesBelow} more`)));
		}
		if (this.autocompleteState && this.autocompleteList) {
			for (const line of this.autocompleteList.render(layoutWidth)) {
				const padding = " ".repeat(Math.max(0, layoutWidth - visibleWidth(line)));
				result.push(makePanelLine(`${" ".repeat(padX)}${line}${padding}${" ".repeat(padX)}`));
			}
		}

		const statusLeft = [meta.modeLabel, meta.modelLabel, meta.providerLabel, meta.thinkingLabel]
			.filter(Boolean)
			.join(" · ");
		result.push(this.renderSplitLine(statusLeft, meta.rightLabel || "models  / commands", width));
		return result;
	}

	private renderSplitLine(left: string, right: string, width: number): string {
		const rightText = truncateToWidth(right, width, "…");
		const availableLeft = Math.max(0, width - visibleWidth(rightText) - 2);
		const leftText = truncateToWidth(left, availableLeft, "…");
		const gap = Math.max(0, width - visibleWidth(leftText) - visibleWidth(rightText));
		return uiTheme.fg("dim", leftText) + " ".repeat(gap) + uiTheme.fg("dim", rightText);
	}

	handleInput(data: string): void {
		// Check extension-registered shortcuts first
		if (this.onExtensionShortcut?.(data)) {
			return;
		}

		// Check for paste image keybinding
		if (this.keybindings.matches(data, "app.clipboard.pasteImage")) {
			this.onPasteImage?.();
			return;
		}

		// Check app keybindings first

		// Escape/interrupt - only if autocomplete is NOT active
		if (this.keybindings.matches(data, "app.interrupt")) {
			if (!this.isShowingAutocomplete()) {
				// Use dynamic onEscape if set, otherwise registered handler
				const handler = this.onEscape ?? this.actionHandlers.get("app.interrupt");
				if (handler) {
					handler();
					return;
				}
			}
			// Let parent handle escape for autocomplete cancellation
			super.handleInput(data);
			return;
		}

		// Exit (Ctrl+D) - only when editor is empty
		if (this.keybindings.matches(data, "app.exit")) {
			if (this.getText().length === 0) {
				const handler = this.onCtrlD ?? this.actionHandlers.get("app.exit");
				if (handler) handler();
				return;
			}
			// Fall through to editor handling for delete-char-forward when not empty
		}

		// Check all other app actions
		for (const [action, handler] of this.actionHandlers) {
			if (action !== "app.interrupt" && action !== "app.exit" && this.keybindings.matches(data, action)) {
				handler();
				return;
			}
		}

		// Pass to parent for editor handling
		super.handleInput(data);
	}
}
