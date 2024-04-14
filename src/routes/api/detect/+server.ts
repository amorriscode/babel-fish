import dedent from 'dedent';

export async function POST({ request, platform }) {
	if (!platform?.env?.AI) {
		throw new Error('Cloudflare AI not available');
	}

	const data = await request.formData();
	const message = data.get('message');

	if (!message) {
		return new Response('Bad Request', { status: 400 });
	}

	const messages = [
		{
			role: 'system',
			content: dedent`You are an expert with ISO 639 language codes. Given any phrase, you will detect the corresponding ISO 639 code. RESPOND WITH THE TWO LETTER ISO 639 CODE, NOTHING ELSE.`
		},
		{
			role: 'user',
			content: `MESSAGE:\nHow do you do today?\nLANGUAGE_CODE:\n`
		},
		{
			role: 'assistant',
			content: `en`
		},
		{
			role: 'user',
			content: `MESSAGE:\nGuten tag!\nLANGUAGE_CODE:\n`
		},
		{
			role: 'assistant',
			content: `de`
		},
		{
			role: 'user',
			content: `MESSAGE:\nこんな風に話すのが嫌い\nLANGUAGE_CODE:\n`
		},
		{
			role: 'assistant',
			content: `ja`
		},
		{
			role: 'user',
			content: `MESSAGE:\n${message}\nLANGUAGE_CODE:\n`
		}
	];

	const { response } = await platform.env.AI.run('@hf/thebloke/mistral-7b-instruct-v0.1-awq', {
		messages
	});

	return new Response(response.trim().slice(0, 2).toLowerCase());
}
