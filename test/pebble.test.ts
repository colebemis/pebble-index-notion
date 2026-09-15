import assert from "node:assert/strict";
import { test } from "node:test";
import {
	hasValidBearerSecret,
	parsePebbleRequest,
} from "../src/pebble.js";

test("accepts the configured bearer secret", () => {
	assert.equal(hasValidBearerSecret("Bearer cherries", "cherries"), true);
	assert.equal(hasValidBearerSecret("Bearer wrong", "cherries"), false);
	assert.equal(hasValidBearerSecret(undefined, "cherries"), false);
});

test("parses a Pebble transcription-only request", async () => {
	const request = pebbleRequest({
		recordedAt: "1788408000123",
		transcription: "Hello from Pebble",
	});
	const result = await parsePebbleRequest({
		rawBody: await request.text(),
		headers: {
			"content-type": request.headers.get("content-type") ?? "",
		},
	});

	assert.deepEqual(result, {
		kind: "transcript",
		value: {
			recordedAt: 1788408000123,
			transcription: "Hello from Pebble",
		},
	});
});

test("ignores audio-only deliveries", async () => {
	const request = pebbleRequest({
		recordedAt: "1788408000123",
	});
	const result = await parsePebbleRequest({
		rawBody: await request.text(),
		headers: {
			"content-type": request.headers.get("content-type") ?? "",
		},
	});

	assert.deepEqual(result, {
		kind: "ignored",
		reason: "no-transcription",
	});
});

test("rejects requests from an unexpected client", async () => {
	const request = pebbleRequest({
		recordedAt: "1788408000123",
		transcription: "Hello",
		client: "phone",
	});
	const result = await parsePebbleRequest({
		rawBody: await request.text(),
		headers: {
			"content-type": request.headers.get("content-type") ?? "",
		},
	});

	assert.deepEqual(result, {
		kind: "ignored",
		reason: "invalid-client",
	});
});

function pebbleRequest(input: {
	recordedAt: string;
	transcription?: string;
	client?: string;
}): Request {
	const form = new FormData();
	form.set("recordedAt", input.recordedAt);
	form.set("client", input.client ?? "ring");
	if (input.transcription !== undefined) {
		form.set("transcription", input.transcription);
	} else {
		form.set(
			"audio",
			new File(["audio"], "recording.m4a", { type: "audio/mp4" }),
		);
	}
	return new Request("https://worker.invalid", {
		method: "POST",
		body: form,
	});
}
