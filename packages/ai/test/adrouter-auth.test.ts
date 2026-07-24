import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ADROUTER_API_URL } from "../src/adrouter-config.ts";
import { adRouterProvider } from "../src/providers/adrouter.ts";

describe("AdRouter authentication", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(JSON.stringify({ id: "user-1", status: "active", mode: "service" }), {
						status: 200,
						headers: { "content-type": "application/json" },
					}),
			),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		delete process.env.ADROUTER_API_URL;
	});

	it("prompts for and validates the staging API key", async () => {
		const prompt = vi.fn(async () => "adr_live_key");
		const provider = adRouterProvider();
		const credential = await provider.auth.apiKey?.login?.({ prompt, notify: vi.fn() });

		expect(prompt).toHaveBeenCalledTimes(1);
		expect(prompt).toHaveBeenCalledWith({
			type: "secret",
			message: "Paste AdRouter API key from app-staging.adrouter.co",
		});
		expect(fetch).toHaveBeenCalledWith(
			`${DEFAULT_ADROUTER_API_URL}/v1/profile`,
			expect.objectContaining({ headers: expect.objectContaining({ authorization: "Bearer adr_live_key" }) }),
		);
		expect(credential).toEqual({ type: "api_key", key: "adr_live_key" });
	});

	it("uses environment URL, legacy stored URL, then the production default", async () => {
		const provider = adRouterProvider();
		const resolve = provider.auth.apiKey?.resolve;
		expect(resolve).toBeDefined();
		const model = provider.getModels()[0]!;
		const context = (values: Record<string, string | undefined>) => ({
			env: async (name: string) => values[name],
			fileExists: async () => false,
		});

		await expect(
			resolve?.({
				model,
				ctx: context({ ADROUTER_API_URL: "https://env.example" }),
				credential: { type: "api_key", key: "key", env: { ADROUTER_API_URL: "https://stored.example" } },
			}),
		).resolves.toMatchObject({ auth: { baseUrl: "https://env.example" } });
		await expect(
			resolve?.({
				model,
				ctx: context({}),
				credential: { type: "api_key", key: "key", env: { ADROUTER_API_URL: "https://stored.example" } },
			}),
		).resolves.toMatchObject({ auth: { baseUrl: "https://stored.example" } });
		await expect(
			resolve?.({ model, ctx: context({}), credential: { type: "api_key", key: "key" } }),
		).resolves.toMatchObject({ auth: { baseUrl: DEFAULT_ADROUTER_API_URL } });
	});
});
