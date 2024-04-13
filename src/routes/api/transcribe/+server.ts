export async function POST({ request, platform }) {
	if (!platform?.env?.AI) {
		throw new Error('Cloudflare AI not available');
	}

	const data = await request.formData();
	const audio = data.get('audio');

	if (!audio || !(audio instanceof File)) {
		throw new Error('Failed to get audio from request');
	}

	const input = {
		audio: [...new Uint8Array(await audio.arrayBuffer())]
	};

	const response = await platform.env.AI.run('@cf/openai/whisper', input);

	return new Response(response.text);
}
