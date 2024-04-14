export async function POST({ request, platform }) {
	const { VITE_VOICE_API_KEY, VITE_VOICE_ID } = import.meta.env;
	const data = await request.formData();
	const message = data.get('message');

	if (!message) {
		return new Response('Bad Request', { status: 400 });
	}

	const url = `https://api.elevenlabs.io/v1/text-to-speech/${VITE_VOICE_ID}`;
	const headers = {
		'Content-Type': 'application/json',
		'xi-api-key': VITE_VOICE_API_KEY
	};

	const options = {
		method: 'POST',
		headers,
		body: JSON.stringify({
			text: message,
			voice_settings: {
				stability: 0.5,
				similarity_boost: 0.5
			}
		})
	};

	try {
		const response = await fetch(url, options);

		if (!response.ok) {
			throw new Error('Text-to-speech API request failed');
		}

		const audioData = await response.arrayBuffer();
		const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });

		return new Response(audioBlob, { status: 200 });
	} catch (error) {
		console.error('Error processing text-to-speech request:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
}
