<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head><title>Create account · ThePirateHarbor</title></svelte:head>

<div class="auth panel">
	<div class="panel-pad stack">
		<h1>Create account</h1>
		{#if form?.error}<p class="notice notice-error">{form.error}</p>{/if}
		{#if data.valid}
			<form method="POST" class="stack">
				<label>
					Username
					<input name="username" required minlength="3" maxlength="32" autocomplete="username" />
				</label>
				<label>
					Email
					<input name="email" type="email" required autocomplete="email" />
				</label>
				<div class="grid-2">
					<label>
						Password
						<input
							name="password"
							type="password"
							required
							minlength="12"
							maxlength="128"
							autocomplete="new-password"
						/>
					</label>
					<label>
						Confirm password
						<input
							name="confirmPassword"
							type="password"
							required
							minlength="12"
							maxlength="128"
							autocomplete="new-password"
						/>
					</label>
				</div>
				<button class="button-primary" type="submit">Create account</button>
			</form>
		{:else}
			<p class="notice notice-error">
				This invitation is invalid, expired, revoked, or already used.
			</p>
			<a class="button" href="/login">Return to login</a>
		{/if}
	</div>
</div>

<style>
	.auth {
		max-width: 520px;
		margin: 3rem auto;
	}
</style>
