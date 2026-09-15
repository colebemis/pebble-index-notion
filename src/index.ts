import {
	WebhookVerificationError,
	Worker,
} from "@notionhq/workers";
import {
	BLOCKS_PER_REQUEST,
	batches,
	chunkTranscript,
	titleFromTranscript,
} from "./notion.js";
import { hasValidBearerSecret, parsePebbleRequest } from "./pebble.js";

const worker = new Worker();
export default worker;

worker.webhook("createNotionPage", {
	title: "Create a Notion page from a Pebble transcript",
	description:
		"Creates one page in a Notion database for each Pebble Index 01 transcript.",
	execute: async (events, { notion }) => {
		requiredEnvironmentVariable("NOTION_API_TOKEN");
		const databaseId = requiredEnvironmentVariable("NOTION_DATABASE_ID");
		const optionalSecret = optionalEnvironmentVariable(
			"PEBBLE_WEBHOOK_SECRET",
		);

		for (const event of events) {
			if (
				optionalSecret !== undefined &&
				!hasValidBearerSecret(event.headers.authorization, optionalSecret)
			) {
				throw new WebhookVerificationError("Invalid Pebble webhook secret");
			}

			const parsed = await parsePebbleRequest(event);
			if (parsed.kind === "ignored") {
				console.log(
					JSON.stringify({
						event: "pebble.transcript.ignored",
						deliveryId: event.deliveryId,
						reason: parsed.reason,
					}),
				);
				continue;
			}

			const chunks = chunkTranscript(parsed.value.transcription);
			const [initialBlocks = [], ...remainingBatches] = batches(
				chunks.map(content => ({
					object: "block" as const,
					type: "paragraph" as const,
					paragraph: {
						rich_text: [
							{
								type: "text" as const,
								text: { content },
							},
						],
					},
				})),
				BLOCKS_PER_REQUEST,
			);

			const page = await notion.pages.create({
				parent: { database_id: databaseId },
				properties: {
					title: {
						title: [
							{
								type: "text",
								text: {
									content: titleFromTranscript(parsed.value.transcription),
								},
							},
						],
					},
				},
				children: [...initialBlocks],
			});

			for (const blockBatch of remainingBatches) {
				await notion.blocks.children.append({
					block_id: page.id,
					children: [...blockBatch],
				});
			}

			console.log(
				JSON.stringify({
					event: "pebble.transcript.created",
					deliveryId: event.deliveryId,
					recordedAt: parsed.value.recordedAt,
					pageId: page.id,
				}),
			);
		}
	},
});

function requiredEnvironmentVariable(name: string): string {
	const value = process.env[name];
	if (value === undefined || value.length === 0) {
		throw new Error(`${name} is not configured`);
	}
	return value;
}

function optionalEnvironmentVariable(name: string): string | undefined {
	const value = process.env[name];
	return value === undefined || value.length === 0 ? undefined : value;
}
