export function formatJsonContent(payload: unknown) {
	return {
		content: [
			{
				type: "text" as const,
				text: JSON.stringify(payload, null, 2),
			},
		],
	};
}
