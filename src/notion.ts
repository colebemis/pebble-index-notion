export const TITLE_MAX_CODE_POINTS = 80;
export const RICH_TEXT_MAX_CHARS = 2_000;
export const BLOCKS_PER_REQUEST = 100;

export function titleFromTranscript(transcript: string): string {
	const firstLine = transcript
		.split(/\r\n|\n|\r/)
		.find(line => line.trim().length > 0);
	const title = firstLine?.trim() ?? transcript.trim();
	return Array.from(title).slice(0, TITLE_MAX_CODE_POINTS).join("");
}

export function chunkTranscript(transcript: string): readonly string[] {
	if (transcript.length === 0) {
		return [];
	}

	const chunks: string[] = [];
	let current = "";
	for (const point of Array.from(transcript)) {
		if (current.length + point.length > RICH_TEXT_MAX_CHARS) {
			chunks.push(current);
			current = point;
		} else {
			current += point;
		}
	}
	if (current.length > 0) {
		chunks.push(current);
	}
	return chunks;
}

export function batches<Value>(
	values: readonly Value[],
	size: number,
): readonly (readonly Value[])[] {
	const result: Value[][] = [];
	for (let index = 0; index < values.length; index += size) {
		result.push(values.slice(index, index + size));
	}
	return result;
}
