declare global {
	namespace App {
		interface Platform {
			env?: {
				AI: AINamespace;
			};
		}
	}
}

export {};
