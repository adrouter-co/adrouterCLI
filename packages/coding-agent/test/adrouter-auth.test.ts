import { generateAdRouterKeyPair } from "@adrouter/ai/api/adrouter-installation-auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	AdRouterInstallationAuth,
	enrollAdRouterInstallation,
	validateAndStoreAdRouterApiKey,
} from "../src/core/adrouter-auth.ts";
import { AuthStorage } from "../src/core/auth-storage.ts";

function installationStorage(): AuthStorage {
	const storage = AuthStorage.inMemory();
	const { privateJwk } = generateAdRouterKeyPair();
	storage.setAdRouterInstallation({
		type: "adrouter_installation",
		version: 1,
		privateJwk,
		refreshCredential: "refresh-1",
		installationId: "installation-1",
		origin: "https://api-staging.adrouter.co",
		scopes: ["agent:turn", "profile:read"],
		refreshFamilyExpiresAt: Date.now() + 60_000,
		clientKind: "cli",
		clientVersion: "0.81.0-beta.7",
		storageClass: "file_protected",
		displayName: "test CLI",
		keyThumbprint: "safe-thumbprint",
		createdAt: Date.now(),
	});
	return storage;
}

describe("AdRouter credential validation", () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		delete process.env.ADROUTER_API_URL;
	});

	it("stores a key only after staging accepts it", async () => {
		process.env.ADROUTER_API_URL = "https://router.example.test";
		const authStorage = AuthStorage.inMemory();
		const fetchMock = vi.fn(
			async () =>
				new Response(JSON.stringify({ id: "user-1", status: "active", mode: "service" }), {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
		);
		vi.stubGlobal("fetch", fetchMock);

		await validateAndStoreAdRouterApiKey(authStorage, "  adr_live_new  ");

		expect(authStorage.get("adrouter")).toEqual({
			type: "api_key",
			key: "adr_live_new",
			env: { ADROUTER_API_URL: "https://router.example.test" },
		});
		expect(fetchMock).toHaveBeenCalledWith(
			"https://router.example.test/v1/profile",
			expect.objectContaining({ headers: expect.objectContaining({ authorization: "Bearer adr_live_new" }) }),
		);
	});

	it("keeps the previous key when validation fails", async () => {
		process.env.ADROUTER_API_URL = "https://router.example.test";
		const authStorage = AuthStorage.inMemory({
			adrouter: { type: "api_key", key: "adr_live_previous" },
		});
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(JSON.stringify({ error: "unauthorized", code: "invalid_api_key" }), {
						status: 401,
						headers: { "content-type": "application/json" },
					}),
			),
		);

		await expect(validateAndStoreAdRouterApiKey(authStorage, "adr_live_invalid")).rejects.toMatchObject({
			status: 401,
			code: "invalid_api_key",
		});
		expect(authStorage.get("adrouter")).toEqual({ type: "api_key", key: "adr_live_previous" });
	});

	it("rejects copied keys for the official hosted origin", async () => {
		const authStorage = AuthStorage.inMemory();
		await expect(validateAndStoreAdRouterApiKey(authStorage, "adr_live_invalid")).rejects.toThrow(
			"approved installation",
		);
		expect(authStorage.get("adrouter")).toBeUndefined();
	});
});

describe("AdRouter installation authentication", () => {
	it("enrolls only after confirmation, honors slow_down, and never persists the access token", async () => {
		vi.useFakeTimers();
		const authStorage = AuthStorage.inMemory();
		let deviceAttempts = 0;
		const fetchMock = vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
			const path = new URL(String(url)).pathname;
			if (path === "/v1/device/authorizations") {
				deviceAttempts++;
				if (deviceAttempts === 1) {
					return new Response(
						JSON.stringify({ error: "A fresh DPoP nonce is required.", code: "use_dpop_nonce" }),
						{
							status: 401,
							headers: { "dpop-nonce": "device_nonce_1234567890" },
						},
					);
				}
				return new Response(
					JSON.stringify({
						device_code: "private-device-code",
						user_code: "ABCD-EFGH",
						verification_uri: "https://app-staging.adrouter.co/installations/connect",
						verification_uri_complete:
							"https://app-staging.adrouter.co/installations/connect?user_code=ABCD-EFGH",
						installation_id: "installation-1",
						expires_in: 600,
						interval: 5,
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				);
			}
			if (
				path === "/v1/oauth/token" &&
				fetchMock.mock.calls.filter((call) => String(call[0]).includes("/v1/oauth/token")).length === 1
			) {
				return new Response(JSON.stringify({ error: "Polling is too frequent.", code: "slow_down" }), {
					status: 400,
					headers: { "content-type": "application/json" },
				});
			}
			if (path === "/v1/oauth/token") {
				return new Response(
					JSON.stringify({
						access_token: "memory-only-access",
						refresh_token: "refresh-accepted",
						installation_id: "installation-1",
						expires_in: 600,
						refresh_family_expires_in: 3600,
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				);
			}
			return new Response(JSON.stringify({ id: "user-1", policy_mode: "observe" }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		});
		const onDeviceCode = vi.fn();
		const enrollment = enrollAdRouterInstallation(
			authStorage,
			{ confirm: async () => true, onDeviceCode },
			fetchMock as typeof fetch,
		);
		await vi.advanceTimersByTimeAsync(15_000);
		await enrollment;

		expect(onDeviceCode).toHaveBeenCalledWith({
			userCode: "ABCD-EFGH",
			verificationUri: "https://app-staging.adrouter.co/installations/connect",
			verificationUriComplete: "https://app-staging.adrouter.co/installations/connect?user_code=ABCD-EFGH",
			expiresAt: expect.any(Number),
		});
		expect(JSON.stringify(onDeviceCode.mock.calls)).not.toContain("private-device-code");
		expect(authStorage.getAdRouterPendingEnrollment()).toBeUndefined();
		expect(authStorage.getAdRouterInstallation()).toMatchObject({
			refreshCredential: "refresh-accepted",
			storageClass: "file_protected",
		});
		expect(JSON.stringify(authStorage.getAdRouterInstallation())).not.toContain("memory-only-access");

		const deviceCalls = fetchMock.mock.calls.filter((call) => String(call[0]).includes("/v1/device/authorizations"));
		expect(deviceCalls).toHaveLength(2);
		expect(new TextDecoder().decode(deviceCalls[0]?.[1]?.body as Uint8Array)).toBe(
			new TextDecoder().decode(deviceCalls[1]?.[1]?.body as Uint8Array),
		);
		const initiation = JSON.parse(new TextDecoder().decode(deviceCalls[1]?.[1]?.body as Uint8Array));
		expect(initiation).toMatchObject({
			client_kind: "cli",
			public_key_jwk: { kty: "OKP", crv: "Ed25519", x: expect.any(String) },
			requested_scopes: ["agent:turn", "profile:read"],
			storage_class: "file_protected",
		});
		expect(initiation).not.toHaveProperty("public_jwk");
		expect(initiation).not.toHaveProperty("scope");
		const retryProof = new Headers(deviceCalls[1]?.[1]?.headers).get("dpop")!;
		const retryClaims = JSON.parse(Buffer.from(retryProof.split(".")[1]!, "base64url").toString("utf8"));
		expect(retryClaims.nonce).toBe("device_nonce_1234567890");

		const deviceGrant = JSON.parse(
			new TextDecoder().decode(
				fetchMock.mock.calls.find((call) => String(call[0]).includes("/v1/oauth/token"))?.[1]?.body as Uint8Array,
			),
		);
		expect(deviceGrant).toEqual({
			grant_type: "urn:ietf:params:oauth:grant-type:device_code",
			device_code: "private-device-code",
			client_kind: "cli",
		});

		const profileCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("/v1/profile"));
		const profileHeaders = new Headers(profileCall?.[1]?.headers);
		expect(profileHeaders.has("content-digest")).toBe(false);
		const profileClaims = JSON.parse(
			Buffer.from(profileHeaders.get("dpop")!.split(".")[1]!, "base64url").toString("utf8"),
		);
		expect(profileClaims).not.toHaveProperty("bht");
	});

	it("resumes an unexpired pending enrollment without starting a replacement", async () => {
		vi.useFakeTimers();
		const authStorage = AuthStorage.inMemory();
		const { privateJwk } = generateAdRouterKeyPair();
		authStorage.setAdRouterPendingEnrollment({
			type: "adrouter_pending_enrollment",
			version: 1,
			privateJwk,
			deviceCode: "resume-device-code",
			userCode: "RESU-ME01",
			verificationUri: "https://app-staging.adrouter.co/installations/connect",
			intervalSeconds: 5,
			expiresAt: Date.now() + 60_000,
			installationId: "installation-resume",
			origin: "https://api-staging.adrouter.co",
			scopes: ["agent:turn", "profile:read"],
			clientVersion: "0.81.0-beta.7",
			displayName: "resume CLI",
			createdAt: Date.now(),
		});
		const fetchMock = vi.fn(async (url: string | URL | Request) => {
			const path = new URL(String(url)).pathname;
			if (path === "/v1/oauth/token") {
				return new Response(
					JSON.stringify({
						access_token: "access-resume",
						refresh_token: "refresh-resume",
						installation_id: "installation-resume",
						expires_in: 600,
						refresh_family_expires_in: 3600,
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				);
			}
			return new Response(JSON.stringify({ id: "user-1" }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		});
		const onProgress = vi.fn();
		const enrollment = enrollAdRouterInstallation(
			authStorage,
			{ confirm: async () => true, onDeviceCode: vi.fn(), onProgress },
			fetchMock as typeof fetch,
		);
		await vi.advanceTimersByTimeAsync(5_000);
		await enrollment;

		expect(onProgress).toHaveBeenCalledWith(expect.stringContaining("Resuming"));
		expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/v1/device/authorizations"))).toBe(false);
		expect(authStorage.getAdRouterInstallation()?.installationId).toBe("installation-resume");
	});

	it("coalesces concurrent memory-token acquisition and persists refresh rotation", async () => {
		const authStorage = installationStorage();
		const fetchMock = vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						access_token: "access-2",
						refresh_token: "refresh-2",
						installation_id: "installation-1",
						expires_in: 600,
						refresh_family_expires_in: 3600,
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				),
		);
		const manager = new AdRouterInstallationAuth(authStorage, fetchMock as typeof fetch);

		const [first, second] = await Promise.all([
			manager.getAccess("https://api-staging.adrouter.co"),
			manager.getAccess("https://api-staging.adrouter.co"),
		]);

		expect(first.accessToken).toBe("access-2");
		expect(second).toEqual(first);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(authStorage.getAdRouterInstallation()?.refreshCredential).toBe("refresh-2");
		expect(JSON.stringify(authStorage.getAdRouterInstallation())).not.toContain("access-2");
	});

	it("always removes local installation material when remote revocation is unavailable", async () => {
		const authStorage = installationStorage();
		const manager = new AdRouterInstallationAuth(
			authStorage,
			vi.fn(async () => Promise.reject(new Error("offline"))) as typeof fetch,
		);

		await expect(manager.signOut()).resolves.toEqual({ remoteRevocationConfirmed: false });
		expect(authStorage.getAdRouterInstallation()).toBeUndefined();
		expect(authStorage.getAdRouterPendingEnrollment()).toBeUndefined();
	});

	it("returns only stable redacted diagnostic fields", () => {
		const authStorage = installationStorage();
		const diagnostics = new AdRouterInstallationAuth(authStorage).diagnostics();
		expect(diagnostics).toMatchObject({
			state: "ready",
			clientKind: "cli",
			storage: "file_protected",
			originClass: "official",
			refreshHealth: "valid",
			signedRequests: true,
			reenrollmentRequired: false,
		});
		const serialized = JSON.stringify(diagnostics);
		expect(serialized).not.toContain("refresh-1");
		expect(serialized).not.toContain("safe-thumbprint");
	});
});
