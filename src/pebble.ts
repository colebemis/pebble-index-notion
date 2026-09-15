import { timingSafeEqual } from "node:crypto";

export type PebbleTranscript = Readonly<{
	recordedAt: number;
	transcription: string;
}>;

export type PebbleParseResult =
	| Readonly<{ kind: "transcript"; value: PebbleTranscript }>
	| Readonly<{ kind: "ignored"; reason: string }>;

export function hasValidBearerSecret(
	authorizationHeader: string | undefined,
	expectedSecret: string,
): boolean {
	if (!authorizationHeader?.startsWith("Bearer ")) {
		return false;
	}

	const providedSecret = authorizationHeader.slice("Bearer ".length);
	const provided = Buffer.from(providedSecret);
	const expected = Buffer.from(expectedSecret);
	if (provided.length !== expected.length) {
		return false;
	}

	return timingSafeEqual(provided, expected);
}

export async function parsePebbleRequest(input: {
	rawBody: string;
	headers: Readonly<Record<string, string>>;
}): Promise<PebbleParseResult> {
	const contentType = input.headers["content-type"];
	if (
		contentType === undefined ||
		(!contentType.startsWith("multipart/form-data") &&
			!contentType.startsWith("application/x-www-form-urlencoded"))
	) {
		return { kind: "ignored", reason: "unsupported-content-type" };
	}

	let form: FormData;
	try {
		const request = new Request("https://worker.invalid", {
			method: "POST",
			headers: { "content-type": contentType },
			body: input.rawBody,
		});
		form = await request.formData();
	} catch {
		return { kind: "ignored", reason: "invalid-form" };
	}

	if (form.get("client") !== "ring") {
		return { kind: "ignored", reason: "invalid-client" };
	}

	const recordedAtValue = form.get("recordedAt");
	if (
		typeof recordedAtValue !== "string" ||
		!/^[0-9]+$/.test(recordedAtValue)
	) {
		return { kind: "ignored", reason: "invalid-recorded-at" };
	}

	const recordedAt = Number(recordedAtValue);
	if (!Number.isSafeInteger(recordedAt) || recordedAt <= 0) {
		return { kind: "ignored", reason: "invalid-recorded-at" };
	}

	const transcription = form.get("transcription");
	if (typeof transcription !== "string" || transcription.trim().length === 0) {
		return { kind: "ignored", reason: "no-transcription" };
	}

	return {
		kind: "transcript",
		value: {
			recordedAt,
			transcription,
		},
	};
}
