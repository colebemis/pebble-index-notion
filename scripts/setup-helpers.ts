export function databaseIdFromInput(input: string): string | undefined {
	const matches = input.match(
		/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}|[0-9a-f]{32}/gi,
	);
	const id = matches?.at(0)?.replaceAll("-", "");
	if (id === undefined) {
		return undefined;
	}
	return [
		id.slice(0, 8),
		id.slice(8, 12),
		id.slice(12, 16),
		id.slice(16, 20),
		id.slice(20),
	].join("-");
}

export function firstDataSourceId(database: unknown): string | undefined {
	if (!isRecord(database) || !Array.isArray(database.data_sources)) {
		return undefined;
	}

	for (const dataSource of database.data_sources) {
		if (isRecord(dataSource) && typeof dataSource.id === "string") {
			return dataSource.id;
		}
	}
	return undefined;
}

export function pageTitle(page: unknown): string | undefined {
	if (!isRecord(page) || !isRecord(page.properties)) {
		return undefined;
	}

	for (const property of Object.values(page.properties)) {
		if (
			!isRecord(property) ||
			property.type !== "title" ||
			!Array.isArray(property.title)
		) {
			continue;
		}

		return property.title
			.map((item: unknown) => {
				if (
					isRecord(item) &&
					typeof item.plain_text === "string"
				) {
					return item.plain_text;
				}
				return "";
			})
			.join("");
	}
	return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}