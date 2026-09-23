<script lang="ts">
	let { form } = $props();
</script>

<svelte:head><title>Setup · ThePirateHarbor</title></svelte:head>

<div class="setup panel">
	<div class="panel-pad">
		<p class="eyebrow">First run</p>
		<h1>Set up ThePirateHarbor</h1>
		<p class="muted">Create the initial administrator. Public registration stays disabled.</p>

		{#if form?.error}<p class="notice notice-error">{form.error}</p>{/if}

		<form method="POST" class="stack">
			<label>
				Site name
				<input
					name="siteName"
					value={form?.values?.siteName ?? 'ThePirateHarbor'}
					required
					maxlength="60"
				/>
			</label>
			<div class="grid-2">
				<label>
					Administrator username
					<input
						name="username"
						value={form?.values?.username ?? ''}
						required
						minlength="3"
						maxlength="32"
						autocomplete="username"
					/>
				</label>
				<label>
					Administrator email
					<input
						name="email"
						type="email"
						value={form?.values?.email ?? ''}
						required
						autocomplete="email"
					/>
				</label>
			</div>
			<label>
				DMCA contact email
				<input
					name="dmcaEmail"
					type="email"
					value={form?.values?.dmcaEmail ?? 'legal@example.com'}
					required
				/>
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
			<div class="row-between">
				<span class="small muted">Registration is invite-only after setup.</span>
				<button class="button-primary" type="submit">Create administrator</button>
			</div>
		</form>
	</div>
</div>

<style>
	.setup {
		max-width: 620px;
		margin: 2.5rem auto;
	}
	.eyebrow {
		margin-bottom: 0.2rem;
		color: var(--accent);
		font-size: 0.72rem;
		font-weight: 800;
		text-transform: uppercase;
	}
</style>
