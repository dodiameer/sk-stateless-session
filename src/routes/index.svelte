<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';

	export const load: Load = ({ session }) => {
		return {
			status: 200,
			props: { session }
		};
	};
</script>

<script lang="ts">
	const clearSession = async () => {
		await fetch(`/session`, { method: 'DELETE' });
		window.location.reload();
	};

	const populateSession = async () => {
		await fetch(`/session`, { method: 'POST' });
		window.location.reload();
	};

	export let session;
</script>

<pre>
  <code>
    {JSON.stringify(session, null, 2)}
  </code>
</pre>
<button on:click={populateSession}>Populate</button>
<button on:click={clearSession}>Clear</button>
