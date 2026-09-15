import assert from "node:assert/strict";
import { test } from "node:test";
import {
	RICH_TEXT_MAX_CHARS,
	TITLE_MAX_CODE_POINTS,
	batches,
	chunkTranscript,
	titleFromTranscript,
} from "../src/notion.js";

test("uses the first non-empty transcript line as the title", () => {
	assert.equal(titleFromTranscript("\n  Buy milk  \nand eggs"), "Buy milk");
});

test("limits the title by Unicode code points", () => {
	const title = titleFromTranscript("🍒".repeat(TITLE_MAX_CODE_POINTS + 1));
	assert.equal(Array.from(title).length, TITLE_MAX_CODE_POINTS);
});

test("chunks transcripts without changing their content", () => {
	const transcript = `Hello ${"x".repeat(RICH_TEXT_MAX_CHARS * 2)}`;
	const chunks = chunkTranscript(transcript);
	assert.equal(chunks.join(""), transcript);
	assert.ok(chunks.every(chunk => chunk.length <= RICH_TEXT_MAX_CHARS));
});

test("creates fixed-size batches", () => {
	assert.deepEqual(batches([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});
