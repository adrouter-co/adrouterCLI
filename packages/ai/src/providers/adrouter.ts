import { DEFAULT_ADROUTER_API_URL, resolveAdRouterApiUrl, validateAdRouterApiKey } from "../adrouter-config.ts";
import { adRouterApi } from "../api/adrouter.lazy.ts";
import type { ApiKeyAuth } from "../auth/types.ts";
import { createProvider, type Provider } from "../models.ts";
import { ADROUTER_MODELS } from "./adrouter.models.ts";

const adRouterAuth: ApiKeyAuth = {
	name: "AdRouter API key",
	login: async (callbacks) => {
		const key = (
			await callbacks.prompt({
				type: "secret",
				message: "Paste AdRouter API key from app-staging.adrouter.co",
			})
		).trim();
		await validateAdRouterApiKey({
			apiKey: key,
			apiUrl: resolveAdRouterApiUrl({ environmentUrl: process.env.ADROUTER_API_URL }),
			signal: callbacks.signal,
		});
		return { type: "api_key", key };
	},
	resolve: async ({ ctx, credential }) => {
		const apiKey = credential?.key ?? (await ctx.env("ADROUTER_API_KEY"));
		const baseUrl = resolveAdRouterApiUrl({
			environmentUrl: await ctx.env("ADROUTER_API_URL"),
			credentialUrl: credential?.env?.ADROUTER_API_URL,
		});
		if (!apiKey) return undefined;
		return {
			auth: { apiKey, baseUrl },
			env: { ADROUTER_API_URL: baseUrl, ADROUTER_API_KEY: apiKey },
			source: credential?.key ? "stored credential" : "ADROUTER_API_KEY",
		};
	},
};

export function adRouterProvider(): Provider<"adrouter-agent"> {
	return createProvider({
		id: "adrouter",
		name: "AdRouter",
		baseUrl: resolveAdRouterApiUrl({
			environmentUrl: process.env.ADROUTER_API_URL,
			modelUrl: DEFAULT_ADROUTER_API_URL,
		}),
		auth: { apiKey: adRouterAuth },
		models: Object.values(ADROUTER_MODELS),
		api: adRouterApi(),
	});
}
