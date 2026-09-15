import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import {
	databaseIdFromInput,
	firstDataSourceId,
	pageTitle,
} from "./setup-helpers.js";

const NOTION_API_BASE_URL = "https://api.notion.com";
const NOTION_API_VERSION = "2026-03-11";
const PERSONAL_ACCESS_TOKENS_URL =
	"https://www.notion.so/profile/integrations";

const token = process.env.NOTION_SETUP_TOKEN;
if (token === undefined || token.length === 0) {
	throw new Error("No Notion token was provided");
}
if (token.includes("\n") || token.includes("\r")) {
	throw new Error("The Notion token contains an unexpected newline");
}
delete process.env.NOTION_SETUP_TOKEN;

const cliEnvironment = {
	...process.env,
	NOTION_API_TOKEN: token,
	NOTION_KEYRING: "0",
};

await verifyToken();
verifyWorkersAccess();
const database = await chooseDatabase();
const dataSourceId = firstDataSourceId(database.value);
if (dataSourceId === undefined) {
	throw new Error(
		"The destination database does not contain a usable data source",
	);
}

run("npm", ["test"]);
run("npm", ["run", "check"]);
deployWorker();
await configureWorker(database.id);
const webhookUrl = getWebhookUrl();
const testTitle = await sendTestWebhook(webhookUrl);
await verifyTestPage(dataSourceId, testTitle);

console.log("\nSetup complete.");
console.log(`Destination: ${database.url ?? database.id}`);
console.log("\nPaste this webhook URL into Pebble Index Agent:");
console.log(webhookUrl);
copyToClipboard(webhookUrl);
console.log("\nIn Pebble, choose Transcription rather than Audio.");

async function verifyToken(): Promise<void> {
	process.stdout.write("Checking Notion token… ");
	await notionRequest("/v1/users/me");
	console.log("done");
}

function verifyWorkersAccess(): void {
	process.stdout.write("Checking Workers access… ");
	runNtn(["workers", "list", "--json"], { captureOutput: true });
	console.log("done");
}

async function chooseDatabase(): Promise<Readonly<{
	id: string;
	url?: string;
	value: unknown;
}>> {
	const readline = createInterface({ input: stdin, output: stdout });
	try {
		console.log("\nWhere should Pebble transcripts go?");
		console.log("  1. Create a new “Pebble Notes” database (recommended)");
		console.log("  2. Use an existing database");
		const choice = (
			await readline.question("Choose 1 or 2 [1]: ")
		).trim();

		if (choice === "" || choice === "1") {
			process.stdout.write("Creating Pebble Notes… ");
			const value = await notionRequest("/v1/databases", {
				method: "POST",
				body: {
					parent: { type: "workspace", workspace: true },
					title: [
						{
							type: "text",
							text: { content: "Pebble Notes" },
						},
					],
					initial_data_source: {
						properties: {
							Name: {
								type: "title",
								title: {},
							},
						},
					},
				},
			});
			const id = objectString(value, "id");
			console.log("done");
			return { id, url: optionalObjectString(value, "url"), value };
		}

		if (choice !== "2") {
			throw new Error("Choose either 1 or 2");
		}

		const input = await readline.question(
			"Paste the existing database link: ",
		);
		const id = databaseIdFromInput(input);
		if (id === undefined) {
			throw new Error("Could not find a database ID in that link");
		}
		process.stdout.write("Checking database access… ");
		const value = await notionRequest(`/v1/databases/${id}`);
		console.log("done");
		return { id, url: optionalObjectString(value, "url"), value };
	} finally {
		readline.close();
	}
}

function deployWorker(): void {
	const isExistingDeployment = exists("workers.json");
	const args = ["workers", "deploy"];
	if (!isExistingDeployment) {
		args.push("--name", "Pebble Index Notion");
	}
	console.log("\nDeploying Notion Worker…");
	runNtn(args);
}

async function configureWorker(databaseId: string): Promise<void> {
	const directory = await mkdtemp(join(tmpdir(), "pebble-index-notion-"));
	const environmentFile = join(directory, "worker.env");
	try {
		await writeFile(
			environmentFile,
			`NOTION_API_TOKEN=${token}\nNOTION_DATABASE_ID=${databaseId}\n`,
			{ encoding: "utf8", mode: 0o600 },
		);
		await chmod(environmentFile, 0o600);
		console.log("Configuring Worker secrets…");
		runNtn([
			"workers",
			"env",
			"push",
			"--file",
			environmentFile,
			"--yes",
		]);
	} finally {
		await rm(directory, { force: true, recursive: true });
	}
}

function getWebhookUrl(): string {
	const output = runNtn(["workers", "webhooks", "list", "--json"], {
		captureOutput: true,
	});
	const result: unknown = JSON.parse(output);
	if (!Array.isArray(result)) {
		throw new Error("The Worker CLI returned an unexpected webhook list");
	}
	for (const webhook of result) {
		if (
			typeof webhook === "object" &&
			webhook !== null &&
			"key" in webhook &&
			webhook.key === "createNotionPage" &&
			"url" in webhook &&
			typeof webhook.url === "string"
		) {
			return webhook.url;
		}
	}
	throw new Error("Could not find the createNotionPage webhook URL");
}

async function sendTestWebhook(webhookUrl: string): Promise<string> {
	const title = `Pebble setup test ${new Date().toISOString()}`;
	const form = new FormData();
	form.set("recordedAt", String(Date.now()));
	form.set("client", "ring");
	form.set(
		"transcription",
		`${title}\n\nYour Pebble Index Notion Worker is ready.`,
	);

	process.stdout.write("Sending a test transcript… ");
	const response = await fetch(webhookUrl, { method: "POST", body: form });
	if (response.status !== 202) {
		throw new Error(`The webhook returned HTTP ${response.status}`);
	}
	console.log("queued");
	return title;
}

async function verifyTestPage(
	dataSourceId: string,
	expectedTitle: string,
): Promise<void> {
	process.stdout.write("Waiting for the test page… ");
	for (let attempt = 0; attempt < 20; attempt += 1) {
		await sleep(1_500);
		const response = await notionRequest(
			`/v1/data_sources/${dataSourceId}/query`,
			{
				method: "POST",
				body: {
					page_size: 25,
					sorts: [{ timestamp: "created_time", direction: "descending" }],
				},
			},
		);
		const results = objectArray(response, "results");
		if (results.some(page => pageTitle(page) === expectedTitle)) {
			console.log("done");
			return;
		}
	}
	throw new Error(
		"The webhook was accepted, but the test page did not appear within 30 seconds",
	);
}

async function notionRequest(
	path: string,
	options?: Readonly<{ method: "POST"; body: unknown }>,
): Promise<unknown> {
	const response = await fetch(`${NOTION_API_BASE_URL}${path}`, {
		method: options?.method ?? "GET",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			"Notion-Version": NOTION_API_VERSION,
		},
		body: options === undefined ? undefined : JSON.stringify(options.body),
	});
	const responseText = await response.text();
	let responseBody: unknown;
	try {
		responseBody = responseText.length === 0
			? undefined
			: JSON.parse(responseText);
	} catch {
		responseBody = undefined;
	}
	if (!response.ok) {
		const message = optionalObjectString(responseBody, "message");
		throw new Error(
			message ??
				`Notion API returned HTTP ${response.status}. Check ${PERSONAL_ACCESS_TOKENS_URL}.`,
		);
	}
	return responseBody;
}

function run(
	command: string,
	args: readonly string[],
	options?: Readonly<{ captureOutput: boolean }>,
): string {
	const result = spawnSync(command, args, {
		encoding: "utf8",
		env: process.env,
		stdio: options?.captureOutput === true
			? ["inherit", "pipe", "inherit"]
			: "inherit",
	});
	if (result.error !== undefined) {
		throw result.error;
	}
	if (result.status !== 0) {
		throw new Error(`${command} exited with status ${result.status ?? "unknown"}`);
	}
	return result.stdout ?? "";
}

function runNtn(
	args: readonly string[],
	options?: Readonly<{ captureOutput: boolean }>,
): string {
	const result = spawnSync("ntn", args, {
		encoding: "utf8",
		env: cliEnvironment,
		stdio: options?.captureOutput === true
			? ["inherit", "pipe", "inherit"]
			: "inherit",
	});
	if (result.error !== undefined) {
		throw result.error;
	}
	if (result.status !== 0) {
		throw new Error(`ntn exited with status ${result.status ?? "unknown"}`);
	}
	return result.stdout ?? "";
}

function exists(path: string): boolean {
	return existsSync(path);
}

function copyToClipboard(value: string): void {
	for (const command of ["pbcopy", "wl-copy", "xclip"]) {
		try {
			if (command === "xclip") {
				execFileSync(command, ["-selection", "clipboard"], { input: value });
			} else {
				execFileSync(command, [], { input: value });
			}
			console.log("(The webhook URL was also copied to your clipboard.)");
			return;
		} catch {
			// Try the next supported clipboard command.
		}
	}
}

function objectString(value: unknown, property: string): string {
	const result = optionalObjectString(value, property);
	if (result === undefined) {
		throw new Error(`Notion response did not include ${property}`);
	}
	return result;
}

function optionalObjectString(
	value: unknown,
	property: string,
): string | undefined {
	if (isRecord(value)) {
		const propertyValue = value[property];
		return typeof propertyValue === "string" ? propertyValue : undefined;
	}
	return undefined;
}

function objectArray(value: unknown, property: string): readonly unknown[] {
	if (isRecord(value)) {
		const propertyValue = value[property];
		return Array.isArray(propertyValue) ? propertyValue : [];
	}
	return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function sleep(milliseconds: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}