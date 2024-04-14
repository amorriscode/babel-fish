const LABEL_MAP = {
	ar: 'arabic',
	bn: 'bengali',
	zh: 'chinese',
	en: 'english',
	de: 'german',
	hi: 'hindi',
	ja: 'japanese',
	pt: 'portugese',
	pa: 'punjabi',
	ru: 'russian',
	es: 'spanish'
};

export type CountryCode =
	| 'ar'
	| 'bn'
	| 'zh'
	| 'en'
	| 'de'
	| 'hi'
	| 'ja'
	| 'pt'
	| 'pa'
	| 'ru'
	| 'es';

export const LANGUAGE_OPTIONS: CountryCode[] = [
	'ar',
	'bn',
	'zh',
	'en',
	'de',
	'hi',
	'ja',
	'pt',
	'pa',
	'ru',
	'es'
];

export function convertCodeToLabel(code: CountryCode | string) {
	return LABEL_MAP[code as CountryCode] ?? '';
}
