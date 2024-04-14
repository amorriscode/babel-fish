<script lang="ts">
	import { page } from '$app/stores';
	import { PUBLIC_SOCKET_URL } from '$env/static/public';
	import { onMount } from 'svelte';

	type Message = {
		id: string;
		userId: string;
		userName: string;
		content: string;
		translatedContent?: string;
		language: string;
	};

	const roomId = $page.params.id;
	let userId: string | undefined;
	let ws: WebSocket | undefined;
	let chunks: any[] = [];
	let mediaRecorder: MediaRecorder | undefined;
	let selectedLanguage = 'english';
	let messages: Message[] = [];
	const languageOptions = [
		'mandarin',
		'spanish',
		'english',
		'hindi',
		'arabic',
		'bengali',
		'russian',
		'portuguese',
		'japanese',
		'punjabi',
		'german'
	];

	onMount(() => {
		userId = crypto.randomUUID();

		ws = new WebSocket(`wss://${PUBLIC_SOCKET_URL}/api/room/${roomId}/join`);

		ws.addEventListener('open', () => {
			console.log('WebSocket connection established');
		});

		ws.addEventListener('message', async (event) => {
			const message = JSON.parse(event.data);
			const messageExists = messages.find(({ id }) => id === message.id);

			if (!messageExists) {
				let translatedContent;

				if (message.language !== selectedLanguage) {
					const body = new FormData();
					body.append('text', message.content);
					body.append('sourceLang', message.language);
					body.append('targetLang', selectedLanguage);

					const response = await fetch('/api/translate', {
						method: 'POST',
						body
					});

					translatedContent = await response.text();
				}
				const newMessage = { ...message, translatedContent };
				messages = [...messages, newMessage];

				await generateVoice(newMessage);
			}
		});

		ws.addEventListener('close', () => {
			console.log('WebSocket connection closed');
		});
	});

	async function generateVoice(message: Message) {
		if (!message.translatedContent) {
			return;
		}
		const translatedContentBody = new FormData();
		translatedContentBody.append('message', message.translatedContent);
		const generateResponse = await fetch('/api/generate', {
			method: 'POST',
			body: translatedContentBody
		});
		const audioBlob = await generateResponse.blob();
		const audioUrl = URL.createObjectURL(audioBlob);

		const audioElement = new Audio(audioUrl);
		audioElement.play();
	}

	async function transcribe(audio: Blob) {
		if (!userId) {
			return;
		}

		const transcribeBody = new FormData();
		transcribeBody.append('audio', audio, 'audio.wav');
		const transcribeResponse = await fetch('/api/transcribe', {
			method: 'POST',
			body: transcribeBody
		});
		const content = await transcribeResponse.text();

		const detectBody = new FormData();
		detectBody.append('message', content);
		const detectResponse = await fetch('/api/detect', {
			method: 'POST',
			body: detectBody
		});
		const language = await detectResponse.text();

		const message: Message = {
			id: crypto.randomUUID(),
			userId,
			userName: userId,
			content,
			language
		};

		messages = [...messages, message];

		ws?.send(JSON.stringify(message));
	}

	async function startTalking() {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

		chunks = [];
		mediaRecorder = new MediaRecorder(stream);
		mediaRecorder.start(1000);

		mediaRecorder.addEventListener('dataavailable', (event) => {
			chunks.push(event.data);
		});
	}

	async function stopTalking() {
		if (!mediaRecorder) {
			return;
		}

		mediaRecorder.stop();

		mediaRecorder.addEventListener('stop', () => {
			if (!chunks.length) {
				return;
			}

			transcribe(new Blob(chunks, { type: 'audio/wav' }));
		});

		mediaRecorder = undefined;
	}
</script>

<h1 class="text-3xl font-bold">babel fish</h1>

<select bind:value={selectedLanguage}>
	{#each languageOptions as language}
		<option>{language}</option>
	{/each}
</select>

{#if mediaRecorder === undefined}
	<button on:click={startTalking}>start talking</button>
{:else}
	<button on:click={stopTalking}>stop talking</button>
{/if}

<div>
	{#each messages as message}
		<div>
			<div>{message.userId} - {message.userName}</div>
			<div>{message.translatedContent ?? message.content}</div>
		</div>
	{/each}
</div>
