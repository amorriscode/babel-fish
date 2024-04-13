import dedent from 'dedent';

export async function POST({ request, platform }) {
	if (!platform?.env?.AI) {
		throw new Error('Cloudflare AI not available');
	}

	const data = await request.formData();
	const text = data.get('text');
	const source_lang = data.get('sourceLang');
	const target_lang = data.get('targetLang');

	if (!text || !source_lang || !target_lang) {
		return new Response('Bad Request', { status: 400 });
	}

	const { translated_text } = await platform.env.AI.run('@cf/meta/m2m100-1.2b', {
		text,
		source_lang,
		target_lang
	});

	return new Response(translated_text);
}
