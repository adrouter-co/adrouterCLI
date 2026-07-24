#!/usr/bin/env node

const DEFAULT_URL = "https://api-staging.adrouter.co/v1/agent/turn";
const EXPECTED_OUTPUT = "staging-canary-ok";
const EXPECTED_MODEL = "deepseek-v4-flash";
const JSON_TYPES = new Set(["application/json", "application/x-ndjson", "application/ndjson"]);

function turnId(event) {
	return event?.turn_id ?? event?.turnId ?? event?.ad?.turn_id ?? event?.settlement?.turn_id;
}

function eventModel(event) {
	return event?.model ?? event?.route?.model ?? event?.settlement?.model ?? event?.assistant?.model;
}

function sponsorPayloads(event) {
	const values = [];
	if (Array.isArray(event?.ads)) values.push(...event.ads);
	if (event?.ad && typeof event.ad === "object") values.push(event.ad);
	if (event?.sponsor && typeof event.sponsor === "object") values.push(event.sponsor);
	if (Array.isArray(event?.sponsors)) values.push(...event.sponsors);
	return values.filter((value) => value && value.tier !== "NONE");
}

function validateAdPayload(payload) {
	if (payload.sponsor) {
		return (
			typeof payload.tier === "string" &&
			typeof payload.sponsor.brand_name === "string" &&
			typeof payload.sponsor.ad_copy === "string"
		);
	}
	return (
		typeof payload.id === "string" &&
		["A", "B", "C"].includes(payload.tier) &&
		typeof payload.title === "string" &&
		typeof payload.body === "string" &&
		typeof payload.label === "string"
	);
}

export function parseCanaryResponse({ adsEnabled, apiKey, contentType, expectedModel, responseText }) {
	const mediaType = contentType.split(";", 1)[0].trim().toLowerCase();
	if (!JSON_TYPES.has(mediaType)) throw new Error("Canary response has a non-JSON content type");
	if (responseText.includes(apiKey)) throw new Error("Canary response reflected the credential");

	let events;
	try {
		if (mediaType === "application/json") {
			const parsed = JSON.parse(responseText);
			events = Array.isArray(parsed) ? parsed : parsed?.events;
		} else {
			events = responseText
				.split(/\r?\n/)
				.filter((line) => line.trim())
				.map((line) => JSON.parse(line));
		}
	} catch {
		throw new Error("Canary response contains malformed JSON");
	}
	if (!Array.isArray(events) || events.length === 0 || events.some((event) => !event || typeof event !== "object")) {
		throw new Error("Canary response contains no protocol events");
	}

	if (events.some((event) => event.type === "error" || event.error)) {
		throw new Error("Canary response contains a router error event");
	}
	const ids = events.map(turnId).filter((value) => typeof value === "string" && value.length > 0);
	if (
		events.some((event) => ["ad", "text", "settlement", "done"].includes(event.type) && !turnId(event)) ||
		ids.length === 0 ||
		new Set(ids).size !== 1
	) {
		throw new Error("Canary response has missing or mismatched turn identifiers");
	}

	const settlementIndex = events.findIndex((event) => event.type === "settlement");
	const doneIndex = events.findIndex((event) => event.type === "done");
	if (settlementIndex < 0) throw new Error("Canary response is missing settlement");
	if (doneIndex < 0 || doneIndex !== events.length - 1 || settlementIndex > doneIndex) {
		throw new Error("Canary response is missing a terminal done event");
	}

	const routes = events.map(eventModel).filter((value) => typeof value === "string");
	if (!routes.includes(expectedModel)) throw new Error("Canary response did not confirm the requested model route");

	const text = events
		.filter((event) => event.type === "text")
		.map((event) => event.content)
		.join("");
	const output = text || events[doneIndex]?.assistant?.content;
	if (output !== EXPECTED_OUTPUT) throw new Error("Canary response output did not match the expected sentinel");
	if (text && events[doneIndex]?.assistant?.content && events[doneIndex].assistant.content !== text) {
		throw new Error("Canary response done snapshot disagrees with reconstructed output");
	}

	const sponsorEntries = events.flatMap((event, index) => sponsorPayloads(event).map((payload) => ({ index, payload })));
	if (!adsEnabled && sponsorEntries.length > 0) throw new Error("Ads-off canary returned a sponsor payload");
	if (adsEnabled && sponsorEntries.length > 0) {
		if (sponsorEntries.some(({ payload }) => !validateAdPayload(payload))) {
			throw new Error("Ads-enabled canary returned an invalid ad-event schema");
		}
		const firstText = events.findIndex((event) => event.type === "text");
		if (firstText >= 0 && sponsorEntries.some(({ index }) => index >= firstText)) {
			throw new Error("Ads-enabled canary returned sponsor inventory after text");
		}
	}

	return { adsReturned: sponsorEntries.length > 0, turnId: ids[0] };
}

function requestBody(adsEnabled) {
	return {
		model: EXPECTED_MODEL,
		context: { messages: [{ role: "user", content: `Return exactly: ${EXPECTED_OUTPUT}` }] },
		metadata: {
			client: "adrouterCLI-release-canary",
			ads_enabled: adsEnabled,
			ad_mode: adsEnabled ? "live" : "off",
		},
		max_output_tokens: 32,
	};
}

export async function runStagingCanary({ apiKey, fetchImpl = fetch, url = DEFAULT_URL }) {
	if (!apiKey) throw new Error("ADROUTER_API_KEY is required from the protected staging environment");
	for (const adsEnabled of [false, true]) {
		const response = await fetchImpl(url, {
			method: "POST",
			headers: {
				accept: "application/x-ndjson, application/json",
				authorization: `Bearer ${apiKey}`,
				"content-type": "application/json",
			},
			body: JSON.stringify(requestBody(adsEnabled)),
		});
		if (!response.ok) throw new Error(`Staging canary failed with HTTP ${response.status}`);
		const responseText = await response.text();
		parseCanaryResponse({
			adsEnabled,
			apiKey,
			contentType: response.headers.get("content-type") ?? "",
			expectedModel: EXPECTED_MODEL,
			responseText,
		});
	}
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
	await runStagingCanary({ apiKey: process.env.ADROUTER_API_KEY });
	console.log("Protected staging canaries passed.");
}
