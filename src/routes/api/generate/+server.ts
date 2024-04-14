import { VOICE_API_KEY, VOICE_ID, VOICE_ID_CHINESE } from '$env/static/private';

export async function POST({ request, platform }) {
	const data = await request.formData();
	const message = data.get('message');
	const language = data.get('language');

	if (!message) {
		return new Response('Bad Request', { status: 400 });
	}

	// hack: use a different language so our hackathon demo looks more cool
	// in the future a user should be able to select the voice that their
	// messages are spoken as
	const voiceId = language === 'zh' ? VOICE_ID_CHINESE : VOICE_ID;
	const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

	const headers = {
		'Content-Type': 'application/json',
		'xi-api-key': VOICE_API_KEY
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
