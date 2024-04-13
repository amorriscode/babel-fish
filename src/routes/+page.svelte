<script lang="ts">
	const fish = `<><`;
	import { goto } from '$app/navigation';
	import { PUBLIC_SOCKET_URL } from '$env/static/public';

	async function createRoom() {
		const response = await fetch(`https://${PUBLIC_SOCKET_URL}/api/room`, {
			method: 'POST'
		});

		await goto(`/room/${await response.text()}`);
	}
</script>

<div class="h-screen flex items-end p-4 gap-12">
	<div>
		<h1 class="text-6xl mb-2 flex items-center">
			babel_fish <span class="whitespace-nowrap tracking-[-0.5em] text-5xl">{fish}</span>
		</h1>
		<button
			on:click={createRoom}
			class="bg-rose-500 hover:bg-rose-600 text-4xl p-4 w-full text-white">create room</button
		>
	</div>

	<div class="text-right text-sm">
		If you stick a Babel fish in your ear you can instantly understand anything said to you in any
		form of language.
	</div>
</div>
