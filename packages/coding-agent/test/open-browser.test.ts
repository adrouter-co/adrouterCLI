import { describe, expect, it } from "vitest";
import { browserLaunchCommand } from "../src/utils/open-browser.ts";

describe("browser launch commands", () => {
	const target = "https://app-staging.adrouter.co/connect?code=ABCD-EFGH&source=cli";

	it.each([
		["darwin", "open", [target]],
		["linux", "xdg-open", [target]],
		["win32", "explorer.exe", [target]],
	] as const)("uses a shell-free launcher on %s", (platform, command, args) => {
		expect(browserLaunchCommand(target, platform)).toEqual({ command, args });
	});
});
