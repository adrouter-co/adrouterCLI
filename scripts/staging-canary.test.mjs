import assert from "node:assert/strict";
import test from "node:test";
import { parseCanaryResponse, runStagingCanary } from "./staging-canary.mjs";

const key = "canary-secret-value";
const model = "deepseek-v4-flash";
const baseEvents = [
	{ type: "text", turn_id: "turn-1", model, content: "staging-canary-ok" },
	{ type: "settlement", turn_id: "turn-1", settlement: { model } },
	{ type: "done", turn_id: "turn-1", model, assistant: { content: "staging-canary-ok" } },
];

function parse(events, options = {}) {
	const ndjson = options.ndjson ?? true;
	return parseCanaryResponse({
		adsEnabled: options.adsEnabled ?? false,
		apiKey: key,
		contentType: options.contentType ?? (ndjson ? "application/x-ndjson" : "application/json"),
		expectedModel: model,
		responseText: ndjson ? events.map((event) => JSON.stringify(event)).join("\n") : JSON.stringify({ events }),
	});
}

test("accepts valid JSON and NDJSON protocol responses", () => {
	assert.equal(parse(baseEvents).turnId, "turn-1");
	assert.equal(parse(baseEvents, { ndjson: false }).turnId, "turn-1");
	assert.equal(
		parse([
			{ ...baseEvents[0], content: " staging-canary-ok\n" },
			baseEvents[1],
			{ ...baseEvents[2], assistant: { content: " staging-canary-ok\n" } },
		]).turnId,
		"turn-1",
	);
	assert.equal(
		parse([
			baseEvents[0],
			{ type: "settlement", settlement: { model } },
			{ type: "done", model, assistant: { content: "staging-canary-ok" } },
		]).turnId,
		"turn-1",
	);
});

test("rejects HTML 200, malformed streams, wrong output, missing settlement/done, and router errors", () => {
	assert.throws(() => parse(baseEvents, { contentType: "text/html" }), /non-JSON content type/);
	assert.throws(
		() =>
			parseCanaryResponse({
				adsEnabled: false,
				apiKey: key,
				contentType: "application/x-ndjson",
				expectedModel: model,
				responseText: '{"type":',
			}),
		/malformed JSON/,
	);
	assert.throws(() => parse([{ ...baseEvents[0], content: "wrong" }, ...baseEvents.slice(1)]), /expected sentinel/);
	assert.throws(() => parse(baseEvents.filter((event) => event.type !== "settlement")), /missing settlement/);
	assert.throws(() => parse(baseEvents.filter((event) => event.type !== "done")), /terminal done/);
	assert.throws(() => parse([{ type: "error", turn_id: "turn-1", model }, ...baseEvents]), /router error/);
});

test("rejects reflected credentials and mismatched turns", () => {
	assert.throws(() => parse([{ ...baseEvents[0], content: key }, ...baseEvents.slice(1)]), /reflected the credential/);
	assert.throws(() => parse(baseEvents.map(({ turn_id: _turnId, ...event }) => event)), /missing/);
	assert.throws(() => parse([{ ...baseEvents[0], turn_id: "turn-other" }, ...baseEvents.slice(1)]), /mismatched/);
});

test("requires ads off and validates ad schema and ordering when inventory exists", () => {
	const ad = {
		type: "ad",
		turn_id: "turn-1",
		model,
		ads: [{ id: "ad-1", tier: "A", title: "Build", body: "Fast CI", label: "Sponsored" }],
	};
	assert.throws(() => parse([ad, ...baseEvents]), /Ads-off/);
	assert.equal(parse([ad, ...baseEvents], { adsEnabled: true }).adsReturned, true);
	assert.equal(
		parse([{ ...ad, ads: [{ ...ad.ads[0], tier: 3 }] }, ...baseEvents], { adsEnabled: true }).adsReturned,
		true,
	);
	assert.throws(() => parse([baseEvents[0], ad, ...baseEvents.slice(1)], { adsEnabled: true }), /after text/);
	assert.throws(
		() => parse([{ ...ad, ads: [{ tier: "A" }] }, ...baseEvents], { adsEnabled: true }),
		/invalid ad-event schema/,
	);
});

test("the live runner sends ads-off first and ads-enabled second without logging bodies", async () => {
	const calls = [];
	const fetchImpl = async (_url, options) => {
		const body = JSON.parse(options.body);
		calls.push(body.metadata.ads_enabled);
		return new Response(baseEvents.map((event) => JSON.stringify(event)).join("\n"), {
			status: 200,
			headers: { "content-type": "application/x-ndjson" },
		});
	};
	await runStagingCanary({ apiKey: key, fetchImpl, url: "https://example.test/turn" });
	assert.deepEqual(calls, [false, true]);
});
