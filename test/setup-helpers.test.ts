import assert from "node:assert/strict";
import { test } from "node:test";
import {
	databaseIdFromInput,
	firstDataSourceId,
	pageTitle,
} from "../scripts/setup-helpers.js";

test("extracts and formats a database ID from a Notion link", () => {
	assert.equal(
		databaseIdFromInput(
			"https://www.notion.so/Pebble-Notes-1234567890abcdef1234567890abcdef?v=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		),
		"12345678-90ab-cdef-1234-567890abcdef",
	);
});

test("accepts an already formatted database ID", () => {
	assert.equal(
		databaseIdFromInput("12345678-90ab-cdef-1234-567890abcdef"),
		"12345678-90ab-cdef-1234-567890abcdef",
	);
});

test("returns the first data source ID", () => {
	assert.equal(
		firstDataSourceId({
			data_sources: [{ id: "data-source-id", name: "Pebble Notes" }],
		}),
		"data-source-id",
	);
});

test("reads a page title without knowing its property name", () => {
	assert.equal(
		pageTitle({
			properties: {
				Name: {
					type: "title",
					title: [
						{ plain_text: "Pebble " },
						{ plain_text: "setup test" },
					],
				},
			},
		}),
		"Pebble setup test",
	);
});