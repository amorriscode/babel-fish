<script lang="ts">
	import { convertCodeToLabel } from '../utils';

	export let userName: string;
	export let content: string | undefined = undefined;
	export let translatedContent: string | undefined = undefined;
	export let language: string | undefined = undefined;
	export let isUser: boolean;

	let displayContent = translatedContent || content;

	function switchContent() {
		if (displayContent === content && translatedContent) {
			displayContent = translatedContent;
		} else {
			displayContent = content;
		}
	}
</script>

<div class={`w-fit max-w-1/3  ${isUser ? '' : 'ml-auto'}`}>
	{#if userName && !isUser}
		<div class="text-[0.6rem] mb-1 text-right w-full text-slate-900/80">
			{userName}
		</div>
	{/if}

	<div class={`bg-white p-4 relative`}>
		<div>{displayContent}</div>

		<div class={`absolute w-4 h-4 -bottom-2 bg-white ${isUser ? '-left-2' : '-right-2'} `} />
	</div>

	{#if translatedContent && language}
		<button
			class="text-[0.6rem] underline decoration-dashed mt-1 pr-4 text-right w-full text-slate-900/80 hover:text-slate-900/90"
			on:click={switchContent}
		>
			translated from {convertCodeToLabel(language)}
		</button>
	{/if}
</div>
