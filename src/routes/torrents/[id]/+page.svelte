<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';
	import SwarmPanel from '$lib/components/SwarmPanel.svelte';
	import { formatBytes, formatDate } from '$lib/format';

	let { data, form } = $props();
	let visibleFiles = $derived(data.torrent.fileManifest.slice(0, 500));
</script>

<svelte:head><title>{data.torrent.name} · {data.config.siteName}</title></svelte:head>

<div class="row-between wrap title-row">
	<div>
		<p class="crumbs">
			<a href="/">Browse</a> /
			<a href="/?category={data.torrent.categorySlug}">{data.torrent.category}</a>
		</p>
		<h1>{data.torrent.name}</h1>
		<div class="inline-list">
			<span class="badge">{data.torrent.sourceType === 'magnet' ? 'Magnet' : 'Torrent'}</span>
			{#if data.torrent.status !== 'visible'}<span class="badge badge-warning"
					>{data.torrent.status}</span
				>{/if}
			{#each data.torrent.tags as tag}<a class="badge" href="/?tag={encodeURIComponent(tag)}"
					>{tag}</a
				>{/each}
		</div>
	</div>
	<div class="row wrap">
		<a class="button button-primary" href={data.torrent.magnetUri}>Open magnet</a>
		{#if data.torrent.sourceType === 'torrent'}<a
				class="button"
				href={`/torrents/${data.torrent.id}/download`}>Download .torrent</a
			>{/if}
	</div>
</div>

<div class="detail-grid">
	<section class="panel panel-pad stack">
		<div>
			<h2>Details</h2>
			<dl class="metadata">
				<div>
					<dt>Info hash</dt>
					<dd class="mono">{data.torrent.infoHash}</dd>
				</div>
				<div>
					<dt>Size</dt>
					<dd>{formatBytes(data.torrent.sizeBytes)}</dd>
				</div>
				<div>
					<dt>Seeders</dt>
					<dd>{data.torrent.seeders}</dd>
				</div>
				<div>
					<dt>Leechers</dt>
					<dd>{data.torrent.leechers}</dd>
				</div>
				<div>
					<dt>Uploaded</dt>
					<dd>{formatDate(data.torrent.createdAt)}</dd>
				</div>
				<div>
					<dt>Uploader</dt>
					<dd><a href={`/users/${data.torrent.uploader}`}>{data.torrent.uploader}</a></dd>
				</div>
				<div>
					<dt>Category</dt>
					<dd>{data.torrent.category}</dd>
				</div>
			</dl>
		</div>
		<div>
			<h2>Description</h2>
			<p class="description">{data.torrent.description || 'No description provided.'}</p>
		</div>
		<SwarmPanel
			magnet={data.torrent.magnetUri}
			enabled={data.config.webTorrentEnabled}
			signedIn={Boolean(data.user)}
		/>
	</section>

	<aside class="panel panel-pad">
		<h2>Files <span class="muted small">({data.torrent.fileManifest.length})</span></h2>
		{#if visibleFiles.length}
			<div class="file-list">
				{#each visibleFiles as file, index}
					<div>
						<span class="file-index">{index + 1}</span><span class="file-name">{file.path}</span
						><span>{formatBytes(file.length)}</span>
					</div>
				{/each}
			</div>
			{#if data.torrent.fileManifest.length > visibleFiles.length}<p class="small muted">
					Showing the first 500 files.
				</p>{/if}
		{:else}
			<p class="muted">File metadata is not available from this magnet yet.</p>
		{/if}
	</aside>
</div>

<section class="panel panel-pad comments">
	<div class="row-between">
		<h2>Comments <span class="muted small">({data.torrent.commentCount})</span></h2>
		{#if data.user}<span class="small muted">Signed in as {data.user.username}</span>{/if}
	</div>
	{#if form?.error}<p class="notice notice-error">{form.error}</p>{/if}
	{#if form?.success}<p class="notice notice-success">{form.success}</p>{/if}
	<div class="comment-list">
		{#each data.comments as comment}
			<article class:hidden={comment.status !== 'visible'}>
				<div class="row">
					<Avatar seed={comment.author} size={26} alt="" />
					<a href={`/users/${comment.author}`}>{comment.author}</a>
					<span class="badge">{comment.authorRole}</span>
					<span class="small muted">{formatDate(comment.createdAt)}</span>
					{#if comment.status !== 'visible'}<span class="badge badge-warning">{comment.status}</span
						>{/if}
				</div>
				<p>{comment.body}</p>
				{#if data.user && comment.authorId !== data.user.id}
					<form method="POST" action="?/report" class="inline-form">
						<input type="hidden" name="commentId" value={comment.id} />
						<button class="button-quiet small" type="submit">Report comment</button>
					</form>
				{/if}
			</article>
		{:else}
			<p class="muted">No comments yet.</p>
		{/each}
	</div>
	{#if data.user}
		<form method="POST" action="?/comment" class="stack comment-form">
			<label
				>Add comment<textarea name="body" required maxlength={data.config.maxCommentLength}
				></textarea></label
			>
			<div><button type="submit">Post comment</button></div>
		</form>
	{:else}
		<p><a href="/login">Log in</a> to comment or report.</p>
	{/if}
</section>

<details class="panel report-panel">
	<summary>Report this torrent</summary>
	<div class="panel-pad">
		{#if data.user}
			<form method="POST" action="?/report" class="stack">
				<label
					>Reason<select name="reason" required
						><option value="copyright">Copyright</option><option value="malware">Malware</option
						><option value="spam">Spam</option><option value="other">Other</option></select
					></label
				>
				<label
					>Details<textarea name="details" required maxlength={data.config.maxReportLength}
					></textarea></label
				>
				<div><button type="submit">Submit report</button></div>
			</form>
		{:else}
			<p><a href="/login">Log in</a> to submit a report.</p>
		{/if}
	</div>
</details>

<style>
	.title-row {
		align-items: flex-start;
		margin-bottom: 0.7rem;
	}
	.title-row h1 {
		max-width: 900px;
		overflow-wrap: anywhere;
	}
	.crumbs {
		margin-bottom: 0.25rem;
		font-size: 0.76rem;
	}
	.detail-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
		gap: 0.7rem;
		align-items: start;
	}
	.metadata {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.35rem 0.8rem;
		margin: 0;
	}
	.metadata div {
		display: grid;
		grid-template-columns: 5.2rem minmax(0, 1fr);
		gap: 0.4rem;
		border-top: 1px solid var(--line);
		padding-top: 0.3rem;
	}
	dt {
		color: var(--muted);
		font-size: 0.74rem;
		font-weight: 700;
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.description {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.file-list {
		max-height: 35rem;
		overflow: auto;
	}
	.file-list > div {
		display: grid;
		grid-template-columns: 2.2rem minmax(0, 1fr) 4.5rem;
		gap: 0.35rem;
		border-top: 1px solid var(--line);
		padding: 0.28rem 0;
		font-size: 0.75rem;
	}
	.file-index {
		color: var(--muted);
		text-align: right;
	}
	.file-name {
		overflow-wrap: anywhere;
	}
	.comments,
	.report-panel {
		margin-top: 0.7rem;
	}
	.comment-list article {
		border-top: 1px solid var(--line);
		padding: 0.55rem 0;
	}
	.comment-list article.hidden {
		opacity: 0.65;
	}
	.comment-list article p {
		margin: 0.35rem 0;
		white-space: pre-wrap;
	}
	.comment-form {
		border-top: 1px solid var(--line);
		padding-top: 0.6rem;
	}
	.report-panel summary {
		padding: 0.55rem 0.8rem;
		cursor: pointer;
		font-weight: 700;
	}
	@media (max-width: 900px) {
		.detail-grid {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 520px) {
		.metadata {
			grid-template-columns: 1fr;
		}
	}
</style>
