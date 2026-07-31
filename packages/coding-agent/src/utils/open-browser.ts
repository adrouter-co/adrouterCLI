import { spawn } from "node:child_process";

export function browserLaunchCommand(
	target: string,
	platform: NodeJS.Platform = process.platform,
): { command: string; args: string[] } {
	if (platform === "darwin") return { command: "open", args: [target] };
	if (platform === "win32") return { command: "explorer.exe", args: [target] };
	return { command: "xdg-open", args: [target] };
}

/**
 * Open a URL or file in the platform browser/default handler.
 *
 * This intentionally never invokes a shell. On Windows, do not use
 * `cmd /c start`: cmd.exe re-parses metacharacters (&, |, ^, ...) before
 * `start` runs, which would make attacker-controlled URLs injectable.
 */
export function openBrowser(target: string, onError?: (error: Error) => void): void {
	const { command, args } = browserLaunchCommand(target);

	// spawn reports launcher failures (for example, missing xdg-open) via an
	// error event. Browser launch is best-effort: callers still present the target
	// to the user, so keep the launcher failure from becoming a process crash.
	spawn(command, args, { stdio: "ignore", detached: true })
		.on("error", (error) => onError?.(error))
		.unref();
}
