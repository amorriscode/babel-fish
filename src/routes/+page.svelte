<script lang="ts">
	import { goto } from '$app/navigation';
	import { PUBLIC_SOCKET_URL } from '$env/static/public';

	async function createRoom() {
		const response = await fetch(`https://${PUBLIC_SOCKET_URL}/api/room`, {
			method: 'POST'
		});

		await goto(`/room/${await response.text()}`);
	}
</script>

<h1 class="text-3xl font-bold">babel fish</h1>

<button on:click={createRoom}>create room</button>
