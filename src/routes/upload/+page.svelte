<script lang="ts">
	let { data, form } = $props();
	let sourceType = $state('magnet');
</script>

<svelte:head><title>Upload torrent · {data.config.siteName}</title></svelte:head>

<div class="row-between wrap">
	<div>
		<h1>Upload torrent</h1>
		<p class="muted">Upload metadata or a magnet link. The index does not host payload files.</p>
	</div>
	<a class="button" href="/">Back to browse</a>
</div>

{#if form?.error}<p class="notice notice-error">{form.error}</p>{/if}

<form method="POST" enctype="multipart/form-data" class="upload panel">
	<div class="panel-pad stack">
		<div class="source-tabs" role="group" aria-label="Submission type">
			<button
				class:active={sourceType === 'magnet'}
				type="button"
				onclick={() => (sourceType = 'magnet')}>Magnet link</button
			>
			<button
				class:active={sourceType === 'torrent'}
				type="button"
				onclick={() => (sourceType = 'torrent')}>.torrent file</button
			>
		</div>
		<input type="hidden" name="sourceType" value={sourceType} />
		<div class="grid-2">
			<label>
				Title
				<input name="title" required maxlength={data.config.maxTitleLength} />
			</label>
			<label>
				Category
				<select name="categoryId" required>
					<option value="">Choose category</option>
					{#each data.categories as category}<option value={category.id}>{category.name}</option
						>{/each}
				</select>
			</label>
		</div>
		{#if sourceType === 'magnet'}
			<label>
				Magnet URI
				<input
					name="magnet"
					value={sourceType === 'magnet' ? '' : ''}
					required={sourceType === 'magnet'}
					maxlength={data.config.maxMagnetLength}
					placeholder="magnet:?xt=urn:btih:…"
				/>
			</label>
		{:else}
			<label>
				Torrent metadata file
				<input
					name="torrentFile"
					type="file"
					accept=".torrent,application/x-bittorrent"
					required={sourceType === 'torrent'}
				/>
			</label>
		{/if}
		<label>
			Tags
			<input name="tags" maxlength="500" placeholder="linux, iso, archive" />
			<span class="small muted">Comma-separated, up to {data.config.maxTags}.</span>
		</label>
		<label>
			Description
			<textarea
				name="description"
				maxlength={data.config.maxDescriptionLength}
				placeholder="Release details, source, language, notes."></textarea>
		</label>
		<div class="row-between wrap">
			<span class="small muted"
				>Maximum metadata size: {data.config.maxTorrentFileBytes} bytes.</span
			>
			<button class="button-primary" type="submit">Add torrent</button>
		</div>
	</div>
</form>

<style>
	.upload {
		max-width: 820px;
		margin-top: 0.75rem;
	}
	.source-tabs {
		display: flex;
		gap: 0.35rem;
	}
	.source-tabs .active {
		border-color: var(--accent);
		background: var(--accent);
		color: white;
	}
</style>
