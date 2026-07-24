import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ADROUTER_API_URL, validateAndStoreAdRouterApiKey } from "../src/core/adrouter-auth.ts";
import { AuthStorage } from "../src/core/auth-storage.ts";

describe("AdRouter credential validation", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		delete process.env.ADROUTER_API_URL;
	});

	it("stores a key only after staging accepts it", async () => {
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

		expect(authStorage.get("adrouter")).toEqual({ type: "api_key", key: "adr_live_new" });
		expect(fetchMock).toHaveBeenCalledWith(
			`${DEFAULT_ADROUTER_API_URL}/v1/profile`,
			expect.objectContaining({ headers: expect.objectContaining({ authorization: "Bearer adr_live_new" }) }),
		);
	});

	it("keeps the previous key when validation fails", async () => {
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
});
