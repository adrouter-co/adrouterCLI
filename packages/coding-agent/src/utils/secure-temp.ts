import {
	chmodSync,
	closeSync,
	constants,
	createWriteStream,
	mkdtempSync,
	openSync,
	rmSync,
	type WriteStream,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface PrivateTempFile {
	directory: string;
	path: string;
	cleanup: () => void;
}

function safePrefix(prefix: string): string {
	const cleaned = prefix.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
	return cleaned || "adrouter-temp";
}

function allocate(prefix: string, suffix: string): { directory: string; path: string; cleanup: () => void } {
	const directory = mkdtempSync(join(tmpdir(), `${safePrefix(prefix)}-`));
	if (process.platform !== "win32") chmodSync(directory, 0o700);
	const path = join(directory, `content${suffix}`);
	let cleaned = false;
	return {
		directory,
		path,
		cleanup: () => {
			if (cleaned) return;
			cleaned = true;
			rmSync(directory, { recursive: true, force: true });
		},
	};
}

/** Allocate an empty, exclusive 0600 file inside a random private temp directory. */
export function createPrivateTempFile(prefix: string, suffix = ""): PrivateTempFile {
	const temp = allocate(prefix, suffix);
	try {
		const fd = openSync(
			temp.path,
			constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0),
			0o600,
		);
		closeSync(fd);
		return temp;
	} catch (error) {
		temp.cleanup();
		throw error;
	}
}

/** Allocate an exclusive 0600 write stream inside a random private temp directory. */
export function createPrivateTempWriteStream(
	prefix: string,
	suffix = ".log",
): PrivateTempFile & { stream: WriteStream } {
	const temp = allocate(prefix, suffix);
	let fd: number | undefined;
	try {
		fd = openSync(
			temp.path,
			constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0),
			0o600,
		);
		const stream = createWriteStream(temp.path, { fd, autoClose: true });
		fd = undefined;
		return { ...temp, stream };
	} catch (error) {
		if (fd !== undefined) closeSync(fd);
		temp.cleanup();
		throw error;
	}
}
