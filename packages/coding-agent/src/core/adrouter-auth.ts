import {
	ADROUTER_PROVIDER_ID,
	type AdRouterProfile,
	DEFAULT_ADROUTER_API_URL,
	resolveAdRouterApiUrl as resolveSharedAdRouterApiUrl,
	validateAdRouterApiKey,
} from "@adrouter/ai";
import type { AuthStorage } from "./auth-storage.ts";

export { ADROUTER_PROVIDER_ID, DEFAULT_ADROUTER_API_URL };

export type AdRouterCredentialSource = "runtime" | "stored" | "environment" | "missing";

export function resolveAdRouterApiUrl(authStorage: AuthStorage): string {
	const stored = authStorage.getProviderEnv(ADROUTER_PROVIDER_ID)?.ADROUTER_API_URL;
	return resolveSharedAdRouterApiUrl({
		environmentUrl: process.env.ADROUTER_API_URL,
		credentialUrl: stored,
	});
}

export async function validateAndStoreAdRouterApiKey(
	authStorage: AuthStorage,
	apiKey: string,
	signal?: AbortSignal,
): Promise<AdRouterProfile> {
	const profile = await validateAdRouterApiKey({
		apiKey,
		apiUrl: resolveAdRouterApiUrl(authStorage),
		signal,
	});
	authStorage.set(ADROUTER_PROVIDER_ID, { type: "api_key", key: apiKey.trim() });
	return profile;
}

export async function resolveAdRouterCredentials(
	authStorage: AuthStorage,
): Promise<{ apiKey?: string; apiUrl: string; source: AdRouterCredentialSource }> {
	const status = authStorage.getAuthStatus(ADROUTER_PROVIDER_ID);
	const apiKey = await authStorage.getApiKey(ADROUTER_PROVIDER_ID);
	const source =
		status.source === "runtime" || status.source === "stored" || status.source === "environment"
			? status.source
			: apiKey
				? "environment"
				: "missing";
	return {
		apiKey,
		apiUrl: resolveAdRouterApiUrl(authStorage),
		source,
	};
}
