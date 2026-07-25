import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { gzipSync } from "node:zlib";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CLI_PACKAGE } from "./npm-artifact.mjs";
import { assertPackageTarball, embeddedDirectDependencyFailures } from "./package-policy.mjs";

function tarEntry(path, content) {
	const body = Buffer.from(content);
	const header = Buffer.alloc(512);
	header.write(path);
	header.write("0000644\0", 100);
	header.write("0000000\0", 108);
	header.write("0000000\0", 116);
	header.write(`${body.length.toString(8).padStart(11, "0")}\0`, 124);
	header.write("00000000000\0", 136);
	header.fill(0x20, 148, 156);
	header.write("0", 156);
	header.write("ustar\0", 257);
	header.write("00", 263);
	const checksum = header.reduce((sum, byte) => sum + byte, 0);
	header.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148);
	return Buffer.concat([header, body, Buffer.alloc((512 - (body.length % 512)) % 512)]);
}

function writeTarball(entries) {
	const directory = mkdtempSync(join(tmpdir(), "adrouter-package-policy-"));
	const path = join(directory, "package.tgz");
	writeFileSync(path, gzipSync(Buffer.concat([...entries.map(([name, body]) => tarEntry(name, body)), Buffer.alloc(1024)])));
	return { directory, path };
}

test("rejects unexpected docs, local paths, and native executable magic", () => {
	for (const [path, content, expected] of [
		["package/extra.md", "undeclared", /unexpected file|undeclared documentation/],
		["package/dist/config.js", "export default '/Users/developer/project'", /local path/],
		["package/dist/tool", Buffer.from([0x7f, 0x45, 0x4c, 0x46]), /ELF executable/],
	]) {
		const fixture = writeTarball([
			["package/package.json", "{}"],
			["package/docs/README.md", "readme"],
			[path, content],
		]);
		try {
			assert.throws(
				() =>
					assertPackageTarball(
						{ name: "@adrouter/tui", kind: "library" },
						{ version: "0.81.0-beta.3" },
						fixture.path,
					),
				expected,
			);
		} finally {
			rmSync(fixture.directory, { recursive: true, force: true });
		}
	}
});

test("rejects a hoisted bundled dependency that conflicts with the CLI declaration", () => {
	const entries = [
		{
			path: "package/node_modules/retry/package.json",
			content: Buffer.from(JSON.stringify({ name: "retry", version: "0.13.1" })),
		},
	];
	assert.deepEqual(
		embeddedDirectDependencyFailures({ dependencies: { retry: "0.12.0" } }, entries),
		["embedded retry@0.13.1 does not match declared 0.12.0"],
	);
	assert.deepEqual(embeddedDirectDependencyFailures({ dependencies: { retry: "0.13.1" } }, entries), []);
});

test("rejects direct workspace packing before an incomplete deployment artifact is created", () => {
	const npm = process.platform === "win32" ? "npm.cmd" : "npm";
	const result = spawnSync(npm, ["pack", "--dry-run", "--workspace", "@adrouter/cli"], {
		encoding: "utf8",
		shell: process.platform === "win32",
	});
	assert.notEqual(result.status, 0);
	assert.match(`${result.stdout}\n${result.stderr}`, /Direct @adrouter\/cli packing\/publishing is unsupported/);
});

test("package policy rejects a direct pack even when lifecycle guards are bypassed", () => {
	const npm = process.platform === "win32" ? "npm.cmd" : "npm";
	const directory = mkdtempSync(join(tmpdir(), "adrouter-direct-pack-"));
	try {
		const result = spawnSync(
			npm,
			["pack", "--ignore-scripts", "--json", "--pack-destination", directory, "--min-release-age=0"],
			{
				cwd: "packages/coding-agent",
				encoding: "utf8",
				env: { ...process.env, NPM_CONFIG_CACHE: join(directory, "npm-cache") },
				shell: process.platform === "win32",
			},
		);
		assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
		const packed = JSON.parse(result.stdout)[0];
		assert.throws(
			() => assertPackageTarball(CLI_PACKAGE, packed, join(directory, packed.filename)),
			/missing bundled package/,
		);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
