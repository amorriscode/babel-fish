<script lang="ts">
	import { page } from '$app/stores';
	import { PUBLIC_SOCKET_URL } from '$env/static/public';
	import { onMount } from 'svelte';

	type Message = {
		id: string;
		userId: string;
		userName: string;
		content: string;
		language: string;
	};

	const roomId = $page.params.id;
	let userId: string | undefined;
	let ws: WebSocket | undefined;
	let chunks: any[] = [];
	let mediaRecorder: MediaRecorder | undefined;
	let spokenLanguage = 'english';
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

		ws.addEventListener('message', (event) => {
			console.log({ event });
			const message = JSON.parse(event.data);
			const messageExists = messages.find(({ id }) => id === message.id);

			if (!messageExists) {
				messages = [...messages, message];
			}
		});

		ws.addEventListener('close', () => {
			console.log('WebSocket connection closed');
		});
	});

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

<h1>babel fish</h1>

<select bind:value={spokenLanguage}>
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
			<div>{message.content}</div>
		</div>
	{/each}
</div>
