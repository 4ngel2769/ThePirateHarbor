<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head><title>DMCA · {data.config.siteName}</title></svelte:head>

<div class="notice-page">
	<h1>DMCA and rights notices</h1>
	<p class="muted">
		Send a specific notice to <a href={`mailto:${data.dmcaEmail}`}>{data.dmcaEmail}</a> using the form
		below. Administrators review and preserve an audit trail.
	</p>
	{#if form?.error}<p class="notice notice-error">{form.error}</p>{/if}
	{#if form?.success}<p class="notice notice-success">{form.success}</p>{/if}
	<form method="POST" class="panel panel-pad stack">
		<div class="grid-2">
			<label>Requester name<input name="requesterName" required maxlength="120" /></label>
			<label>Requester email<input name="requesterEmail" type="email" required /></label>
		</div>
		<div class="grid-2">
			<label>Original material URL<input name="originalUrl" type="url" maxlength="1000" /></label>
			<label>Info hash<input name="infoHash" maxlength="40" pattern="[a-fA-F0-9]{40}" /></label>
		</div>
		<label>Harbor torrent ID<input name="torrentId" type="number" min="1" /></label>
		<label>
			Statement
			<textarea
				name="statement"
				required
				minlength="100"
				maxlength="5000"
				placeholder="Identify the copyrighted work, the material, your authority, and the requested action."
			></textarea>
		</label>
		<div class="row-between wrap">
			<span class="small muted">Provide at least one target: URL, info hash, or torrent ID.</span>
			<button class="button-primary" type="submit">Submit notice</button>
		</div>
	</form>
</div>

<style>
	.notice-page {
		max-width: 820px;
		margin: 1.5rem auto;
	}
</style>
