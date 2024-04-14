<script lang="ts">
	import { page } from '$app/stores';
	import { PUBLIC_SOCKET_URL } from '$env/static/public';
	import { onMount } from 'svelte';
	import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';
	import { throttle } from 'lodash-es';

	import MessageBubble from '../../../components/message-bubble.svelte';

	const fish = `<><`;

	type Message = {
		id: string;
		userId: string;
		userName: string;
		content?: string;
		translatedContent?: string;
		language?: string;
	};

	type QueueItem = {
		id: string;
		message?: Partial<Message>;
		timestamp: string;
	};

	const LANGUAGE_OPTIONS = [
		{ label: 'arabic', value: 'ar' },
		{ label: 'bengali', value: 'bn' },
		{ label: 'chinese', value: 'zh' },
		{ label: 'english', value: 'en' },
		{ label: 'german', value: 'de' },
		{ label: 'hindi', value: 'hi' },
		{ label: 'japanese', value: 'ja' },
		{ label: 'portugese', value: 'pt' },
		{ label: 'punjabi', value: 'pa' },
		{ label: 'russian', value: 'ru' },
		{ label: 'spanish', value: 'es' }
	];

	const roomId = $page.params.id;
	let userId: string;
	let userName: string;

	let ws: WebSocket | undefined;

	let selectedLanguage = 'english';

	let messages: Message[] = [];
	let messageQueue: QueueItem[] = [];

	let isTalking = false;
	let audioContext: AudioContext | undefined;
	let audioWorkletNode: AudioWorkletNode | undefined;
	let microphoneMediaStreamSource: MediaStreamAudioSourceNode | undefined;

	let copyText = 'copy room link';

	onMount(async () => {
		userId = crypto.randomUUID();
		userName = uniqueNamesGenerator({
			dictionaries: [colors, adjectives, animals],
			style: 'capital',
			separator: '',
			length: 2
		});

		ws = new WebSocket(`wss://${PUBLIC_SOCKET_URL}/api/room/${roomId}/join`);

		ws.addEventListener('open', () => {
			console.log('WebSocket connection established');
		});

		ws.addEventListener('message', async (event) => {
			const message = JSON.parse(event.data);
			const existingMessage = messages.find(({ id }) => id === message.id);
			const isCurrentUser = existingMessage?.userId === userId;

			if (isCurrentUser) {
				return;
			}

			// Generate a queue item before doing any slow async calls
			const queueItemId = crypto.randomUUID();
			addQueueItem({ id: queueItemId, timestamp: new Date().toISOString() });

			let translatedContent;
			const sourceLang = message.language || (await detectLanguage(message.content));

			if (!isCurrentUser && sourceLang !== selectedLanguage) {
				const body = new FormData();
				body.append('text', message.content);
				body.append('sourceLang', sourceLang);
				body.append('targetLang', selectedLanguage);
				const response = await fetch('/api/translate', {
					method: 'POST',
					body
				});
				translatedContent = (await response.text()).trim();
			}

			const content = message.content || existingMessage?.content;
			updateQueueItem(queueItemId, {
				...message,
				content,
				translatedContent,
				language: sourceLang
			});

			await generateVoice(translatedContent || content);
		});

		ws.addEventListener('close', () => {
			console.log('WebSocket connection closed');
		});
	});

	async function generateVoice(content: string) {
		if (!content) {
			return;
		}

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
		if (!userId || !userName) {
			return;
		}

		// Generate a queue item before doing any slow async calls
		const queueItemId = crypto.randomUUID();
		addQueueItem({ id: queueItemId, timestamp: new Date().toISOString() });

		const transcribeBody = new FormData();
		transcribeBody.append('audio', audio, 'audio.wav');
		const transcribeResponse = await fetch('/api/transcribe', {
			method: 'POST',
			body: transcribeBody
		});
		const content = (await transcribeResponse.text()).trim();

		// hack: quiet audio sometimes shows up as 'you' or 'MBC 뉴스 김정은입니다'
		if (content === 'you' || content.includes('MBC 뉴스 김정은입니다')) {
			removeQueueItem(queueItemId);
			return;
		}

		updateQueueItem(queueItemId, { id: messageId, content });
	}

	async function handleStartTalking() {
		isTalking = true;
		const messageId = crypto.randomUUID();

		// add the message so it'll exist once we start transcribing
		addMessage({
			id: messageId,
			userId,
			userName
		});

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

	const processQueue = throttle(async () => {
		if (!messageQueue.length) {
			return;
		}

		// Sort the queue
		const q = [...messageQueue].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

		const queueItem = q[0];
		if (!queueItem) {
			return;
		}

		const { message } = queueItem;
		if (message?.id && (message?.content || message?.translatedContent)) {
			await updateMessage(message.id, message);
			messageQueue = q.slice(1);
		}

		if (q.length) {
			processQueue();
		}
	}, 1000);

	async function detectLanguage(content: string) {
		const detectBody = new FormData();
		detectBody.append('message', content);

		const detectResponse = await fetch('/api/detect', {
			method: 'POST',
			body: detectBody
		});

		return await detectResponse.text();
	}

	async function addMessage(message: Message) {
		messages = [...messages, message];
	}

	async function addQueueItem(item: QueueItem) {
		messageQueue = [...messageQueue, item];
	}

	async function removeQueueItem(itemId: string) {
		messageQueue = messageQueue.filter(({ id }) => id !== itemId);
	}

	async function updateQueueItem(itemId: string, message: Partial<Message>) {
		messageQueue = messageQueue.map((item) => (item.id === itemId ? { ...item, message } : item));
		processQueue();
	}

	async function updateMessage(messageId: string, partialMessage: Partial<Message>) {
		const existingMessage = messages.find(({ id }) => id === messageId);

		// Messages should always exist because they are added
		// when a user starts talking
		if (!existingMessage) {
			addMessage({ id: messageId, ...partialMessage } as Message);
			return;
		}

		// If there is content and it is my message then broadcast to the world!
		if (partialMessage.content && existingMessage.userId === userId) {
			broadcastMessage(messageId, partialMessage.content);
		}

		const updatedMessage: Partial<Message> = {
			content: [existingMessage.content, partialMessage.content].filter(Boolean).join(' '),
			translatedContent: [existingMessage.translatedContent, partialMessage.translatedContent]
				.filter(Boolean)
				.join(' ')
		};

		// Detect language if it hasn't already be saved
		const content = partialMessage.content || existingMessage.content;

		if (content && !existingMessage.language) {
			updatedMessage.language = await detectLanguage(content);
		}

		messages = messages.map((message) =>
			message.id === messageId ? { ...message, ...updatedMessage } : message
		);
	}

	function broadcastMessage(messageId: string, content: string) {
		const messageToSend = messages.find(({ id }) => id === messageId);
		if (messageToSend) {
			ws?.send(
				JSON.stringify({
					id: messageToSend.id,
					userId,
					userName,
					content,
					language: messageToSend.language
				})
			);
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

	function handleKeyDown(e: KeyboardEvent) {
		if (e.code === 'Space') {
			if (isTalking) {
				handleStopTalking();
			} else {
				handleStartTalking();
			}
		}
	}

	function handleRoomUrlCopy() {
		navigator.clipboard.writeText(window.location.href);
		copyText = 'copied!';

		setTimeout(() => {
			copyText = 'copy room link';
		}, 3000);
	}
</script>

<svelte:window on:keydown|preventDefault={handleKeyDown} />

<div class="h-screen overflow-hidden">
	<div class="p-4 flex justify-between">
		<h1 class="text-2xl">babel_fish</h1>

		<div class="flex items-center gap-4">
			<div>get responses in</div>
			<select bind:value={selectedLanguage} class="text-sm p-2">
				{#each LANGUAGE_OPTIONS as language}
					<option id={language.value}>{language.label}</option>
				{/each}
			</select>
		</div>
	</div>

	<div class="flex w-full">
		{#if !isTalking}
			<button
				on:click={handleStartTalking}
				class="bg-rose-500 hover:bg-rose-600 text-4xl p-4 text-white w-full">start talking</button
			>
		{:else}
			<button
				on:click={handleStopTalking}
				class="bg-purple-500 hover:bg-purple-600 text-4xl p-4 text-white w-full"
				>stop talking</button
			>
		{/if}
	</div>

	<button
		class="underline decoration-dashed my-2 text-center text-sm text-slate-900/80 hover:text-slate-900/90 w-full"
		on:click={handleRoomUrlCopy}>{copyText}</button
	>

	<div class="overflow-y-auto" style="height: calc(100vh - 155px);">
		{#if !messages.length}
			<div class="w-2/3 mx-auto text-center mt-20 text-6xl tracking-[-0.5em]">
				{fish}
			</div>
			<div class="w-2/3 mx-auto text-center mt-8 text-2xl">
				It's lonely in here. Why don't you say something?
			</div>
		{/if}

		<div class="space-y-4 p-4">
			{#each messages as message}
				{#if message.content || message.translatedContent}
					{#key message.content}
						<MessageBubble {...message} isUser={message.userId === userId} />
					{/key}
				{/if}
			{/each}
		</div>
	</div>
</div>
