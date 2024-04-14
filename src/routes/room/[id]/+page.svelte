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

	const LANGUAGE_OPTIONS = [
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

	const roomId = $page.params.id;
	let userId: string | undefined;

	let ws: WebSocket | undefined;

	let selectedLanguage = 'english';

	let messages: Message[] = [];

	let isTalking = false;
	let audioContext: AudioContext | undefined;
	let audioWorkletNode: AudioWorkletNode | undefined;
	let microphoneMediaStreamSource: MediaStreamAudioSourceNode | undefined;

	onMount(async () => {
		userId = crypto.randomUUID();

		ws = new WebSocket(`wss://${PUBLIC_SOCKET_URL}/api/room/${roomId}/join`);

		ws.addEventListener('open', () => {
			console.log('WebSocket connection established');
		});

		ws.addEventListener('message', async (event) => {
			const message = JSON.parse(event.data);
			const existingMessage = messages.find(({ id }) => id === message.id);

			if (existingMessage?.userId === userId) {
				return;
			}

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

			let newMessage: Message;
			if (existingMessage) {
				updateMessage(existingMessage.id, {
					content: `${existingMessage.content} ${message.content}`,
					translatedContent: `${existingMessage.translatedContent ? existingMessage.translatedContent + ' ' : ''}${translatedContent}`
				});
			} else {
				addMessage({ ...message, translatedContent });
			}

			await generateVoice(translatedContent || message.content);
		});

		ws.addEventListener('close', () => {
			console.log('WebSocket connection closed');
		});
	});

	async function generateVoice(content: string) {
		const translatedContentBody = new FormData();
		translatedContentBody.append('message', content);
		const generateResponse = await fetch('/api/generate', {
			method: 'POST',
			body: translatedContentBody
		});

		const audioBlob = await generateResponse.blob();
		const audioUrl = URL.createObjectURL(audioBlob);

		const audioElement = new Audio(audioUrl);
		audioElement.play();
	}

	async function transcribe(messageId: string, audio: Blob) {
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

		const isExistingMessage = messages.find(({ id }) => id === messageId);

		if (isExistingMessage) {
			updateMessage(messageId, { content: `${isExistingMessage.content} ${content}` });
		} else {
			const detectBody = new FormData();
			detectBody.append('message', content);
			const detectResponse = await fetch('/api/detect', {
				method: 'POST',
				body: detectBody
			});
			const language = await detectResponse.text();

			addMessage({
				id: messageId,
				userId,
				userName: userId,
				content,
				language
			});
		}

		broadcastMessage(messageId);
	}

	async function handleStartTalking() {
		isTalking = true;
		const messageId = crypto.randomUUID();

		audioContext = new AudioContext();
		const microphoneMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

		microphoneMediaStreamSource = audioContext.createMediaStreamSource(microphoneMediaStream);
		await audioContext.audioWorklet.addModule('/worklet.js');

		audioWorkletNode = new AudioWorkletNode(audioContext, 'worklet', {
			processorOptions: {
				sampleRate: audioContext.sampleRate
			}
		});

		microphoneMediaStreamSource.connect(audioWorkletNode).connect(audioContext.destination);

		audioWorkletNode.port.onmessage = (event) => {
			switch (event.data.type) {
				case 'log':
					console.log(`[WORKLET]: ${event.data.message}`);
					break;
				case 'bytes':
					transcribe(messageId, new Blob([event.data.bytes], { type: 'audio/wav' }));
					break;
				case 'stop':
					handleStopTalking();
					break;
				default:
					console.error(`Unhandled worklet message type ${event.data.type}`);
			}
		};
	}

	function addMessage(message: Message) {
		messages = [...messages, message];
	}

	function updateMessage(id: string, updatedMessage: Partial<Message>) {
		messages = messages.map((message) =>
			message.id === id ? { ...message, ...updatedMessage } : message
		);
		// messages = messages;
	}

	function broadcastMessage(messageId: string) {
		const messageToSend = messages.find(({ id }) => id === messageId);
		if (messageToSend) {
			ws?.send(JSON.stringify(messageToSend));
		}
	}

	async function handleStopTalking() {
		if (!audioContext || !audioWorkletNode || !microphoneMediaStreamSource) {
			return;
		}

		audioWorkletNode.disconnect(audioContext.destination);
		microphoneMediaStreamSource.disconnect(audioWorkletNode);

		audioContext = undefined;
		audioWorkletNode = undefined;
		isTalking = false;
	}
</script>

<h1 class="text-3xl font-bold">babel fish</h1>

<select bind:value={selectedLanguage}>
	{#each LANGUAGE_OPTIONS as language}
		<option>{language}</option>
	{/each}
</select>

{#if !isTalking}
	<button on:click={handleStartTalking}>start talking</button>
{:else}
	<button on:click={handleStopTalking}>stop talking</button>
{/if}

<div>
	{#each messages as message}
		<div>
			<div>{message.id}</div>
			<div>{message.translatedContent ?? message.content}</div>
		</div>
	{/each}
</div>
