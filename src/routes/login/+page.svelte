<script lang="ts">
	let { form } = $props();
</script>

<svelte:head><title>Log in · ThePirateHarbor</title></svelte:head>

<div class="auth panel">
	<div class="panel-pad stack">
		<h1>Log in</h1>
		<p class="muted">Accounts are available by invitation.</p>
		{#if form?.error}<p class="notice notice-error">{form.error}</p>{/if}
		<form method="POST" class="stack">
			<label>
				Username
				<input name="username" value={form?.username ?? ''} required autocomplete="username" />
			</label>
			<label>
				Password
				<input name="password" type="password" required autocomplete="current-password" />
			</label>
			<button class="button-primary" type="submit">Log in</button>
		</form>
	</div>
</div>

<style>
	.auth {
		max-width: 420px;
		margin: 3rem auto;
	}
</style>
