import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	base64UrlSha256,
	canonicalAdRouterProofUrl,
	contentDigestSha256,
	createAdRouterDpopProof,
	isValidAdRouterNonce,
	validateAdRouterPrivateJwk,
	verifyAdRouterDpopProofForTest,
} from "../src/api/adrouter-installation-auth.ts";

const fixturePath = fileURLToPath(new URL("./fixtures/platform-auth-v1.json", import.meta.url));
const fixtureText = readFileSync(fixturePath, "utf8");
const fixture = JSON.parse(fixtureText) as Record<string, any>;
const releaseManifest = JSON.parse(
	readFileSync(fileURLToPath(new URL("../../../release-manifest.json", import.meta.url)), "utf8"),
) as Record<string, any>;

describe("platform-auth-v1 proof primitives", () => {
	it("matches the release-controlled exact-body fixture", () => {
		expect(fixture.fixture_version).toBe("platform-auth-v1");
		expect(releaseManifest.authentication.fixture).toBe("packages/ai/test/fixtures/platform-auth-v1.json");
		expect(createHash("sha256").update(fixtureText).digest("hex")).toBe(releaseManifest.authentication.fixtureSha256);

		const body = new TextEncoder().encode(fixture.raw_body_utf8);
		expect(canonicalAdRouterProofUrl(`${fixture.normalized_htu}?ignored=1#ignored`)).toBe(fixture.normalized_htu);
		expect(contentDigestSha256(body)).toBe(fixture.content_digest);
		expect(base64UrlSha256(body)).toBe(fixture.bht);
		expect(base64UrlSha256(fixture.non_secret_test_access_token)).toBe(fixture.access_token_sha256_base64url);
		const proof = createAdRouterDpopProof({
			privateJwk: fixture.test_private_jwk,
			method: fixture.method,
			url: fixture.normalized_htu,
			body,
			accessToken: fixture.non_secret_test_access_token,
			nonce: fixture.claims.nonce,
			clientVersion: fixture.claims.client_version,
			now: fixture.claims.iat * 1000,
			jti: fixture.claims.jti,
		});
		expect(proof).toBe(fixture.proof_jwt);
		expect(verifyAdRouterDpopProofForTest(proof)).toBe(true);
		expect(JSON.stringify(JSON.parse(Buffer.from(proof.split(".")[0]!, "base64url").toString()))).not.toContain(
			fixture.test_private_jwk.d,
		);
		expect(fixture.negative_vectors).toHaveLength(10);
	});

	it("binds proofs to the exact bytes and rejects malformed nonce values", () => {
		const original = new TextEncoder().encode(fixture.raw_body_utf8);
		const tampered = new TextEncoder().encode(`${fixture.raw_body_utf8} `);
		expect(base64UrlSha256(tampered)).not.toBe(base64UrlSha256(original));
		expect(isValidAdRouterNonce("valid_nonce_1234567890")).toBe(true);
		expect(isValidAdRouterNonce("short")).toBe(false);
		expect(isValidAdRouterNonce("invalid nonce with spaces")).toBe(false);
		expect(() =>
			validateAdRouterPrivateJwk({
				...fixture.test_private_jwk,
				x: `${fixture.test_private_jwk.x.slice(0, -1)}A`,
			}),
		).toThrow("Invalid installation key");
	});
});
