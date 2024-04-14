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
	{#if message.userName && !isUser}
		<div class="text-[0.6rem] mb-1 text-right w-full text-slate-900/80">
			{message.userName}
		</div>
	{/if}

	<div class={`bg-white p-4 relative`}>
		<div>{content}</div>

		<div class={`absolute w-4 h-4 -bottom-2 bg-white ${isUser ? '-left-2' : '-right-2'} `} />
	</div>

	{#if message.translatedContent}
		<button
			class="text-[0.6rem] underline decoration-dashed mt-1 pr-4 text-right w-full text-slate-900/80 hover:text-slate-900/90"
			on:click={switchContent}
		>
			translated from {message.language}
		</button>
	{/if}
</div>
