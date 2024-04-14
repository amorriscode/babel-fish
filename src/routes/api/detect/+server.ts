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
			content: dedent`You are an expert language detector. When given a message you respond in a single word with the lanugage.
      
      MESSAGE:
      How do you do today?
      LANGUAGE:
      english
      
      MESSAGE:
      Guten tag!
      LANGUAGE:
      german
      `
		},
		{
			role: 'user',
			content: `MESSAGE:\n${message}\nLANGUAGE:`
		}
	];

	const { response } = await platform.env.AI.run('@hf/thebloke/mistral-7b-instruct-v0.1-awq', {
		messages
	});

	return new Response(response.trim().toLowerCase());
}
