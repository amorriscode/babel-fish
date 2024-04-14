<script lang="ts">
	type Message = {
		id: string;
		userId: string;
		userName: string;
		content: string;
		translatedContent?: string;
		language: string;
	};

	export let message: Message;
	export let isUser: boolean;

	let content = message.translatedContent ?? message.content;

	function switchContent() {
		if (content === message.content && message.translatedContent) {
			content = message.translatedContent;
		} else {
			content = message.content;
		}
	}
</script>

<div class={`w-fit max-w-1/3  ${isUser ? '' : 'ml-auto'}`}>
	<div class={`bg-white p-4 relative`}>
		<div>{content}</div>

		<div class={`absolute w-4 h-4 -bottom-2 bg-white ${isUser ? '-left-2' : '-right-2'} `} />
	</div>

	{#if message.translatedContent}
		<button
			class="text-[0.6rem] underline decoration-dashed mt-1 pr-4 text-right w-full"
			on:click={switchContent}
		>
			translated from {message.language}
		</button>
	{/if}
</div>
