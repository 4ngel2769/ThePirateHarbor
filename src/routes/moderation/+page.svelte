<script lang="ts">
	import { formatDate } from '$lib/format';

	let { data, form } = $props();
</script>

<svelte:head><title>Moderation · {data.config.siteName}</title></svelte:head>

<div class="row-between wrap">
	<div>
		<h1>Moderation queue</h1>
		<p class="muted">Reports and content state changes are written to the audit log.</p>
	</div>
	<span class="badge"
		>{data.reports.filter((report) => report.status === 'open' || report.status === 'reviewing')
			.length} active reports</span
	>
</div>

{#if form?.error}<p class="notice notice-error">{form.error}</p>{/if}
{#if form?.success}<p class="notice notice-success">{form.success}</p>{/if}

<section class="panel panel-pad">
	<h2>Reports</h2>
	<div class="table-wrap">
		<table>
			<thead
				><tr
					><th>Target</th><th>Reason</th><th>Details</th><th>Reporter</th><th>Status</th><th
						>Action</th
					></tr
				></thead
			>
			<tbody>
				{#each data.reports as report}
					<tr>
						<td
							>{#if report.torrentId}<a href={`/torrents/${report.torrentId}`}
									>{report.torrentName}</a
								>{:else}Deleted target{/if}{#if report.commentId}<div class="small muted">
									Comment #{report.commentId}
								</div>{/if}</td
						>
						<td><span class="badge">{report.reason}</span></td>
						<td class="details">{report.details}</td>
						<td
							>{report.reporter}
							<div class="small muted">{formatDate(report.createdAt)}</div></td
						>
						<td><span class="badge">{report.status}</span></td>
						<td>
							<form method="POST" action="?/report" class="action-form">
								<input type="hidden" name="reportId" value={report.id} />
								<select name="status" aria-label="Report status"
									><option value="open">Open</option><option value="reviewing">Reviewing</option
									><option value="resolved">Resolve</option><option value="dismissed"
										>Dismiss</option
									></select
								>
								<button type="submit">Apply</button>
							</form>
						</td>
					</tr>
				{:else}
					<tr><td colspan="6">No reports.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<div class="grid-2 section-gap">
	<section class="panel panel-pad">
		<h2>Hidden and removed torrents</h2>
		<div class="table-wrap">
			<table>
				<thead><tr><th>Torrent</th><th>Status</th><th>Action</th></tr></thead>
				<tbody>
					{#each data.content.torrents as torrent}
						<tr>
							<td><a href={`/torrents/${torrent.id}`}>{torrent.name}</a></td>
							<td><span class="badge">{torrent.status}</span></td>
							<td>
								<form method="POST" action="?/torrent" class="action-form">
									<input type="hidden" name="torrentId" value={torrent.id} />
									<select name="status" aria-label="Torrent status"
										><option value="visible">Visible</option><option value="hidden">Hidden</option
										>{#if data.user?.role === 'admin'}<option value="removed">Removed</option
											>{/if}</select
									>
									<button type="submit">Apply</button>
								</form>
							</td>
						</tr>
					{:else}
						<tr><td colspan="3">No hidden torrents.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="panel panel-pad">
		<h2>Hidden and deleted comments</h2>
		<div class="table-wrap">
			<table>
				<thead><tr><th>Comment</th><th>Status</th><th>Action</th></tr></thead>
				<tbody>
					{#each data.content.comments as comment}
						<tr>
							<td
								>{comment.body}
								<div class="small muted">
									{comment.author} on
									<a href={`/torrents/${comment.torrentId}`}>{comment.torrentName}</a>
								</div></td
							>
							<td><span class="badge">{comment.status}</span></td>
							<td>
								<form method="POST" action="?/comment" class="action-form">
									<input type="hidden" name="commentId" value={comment.id} />
									<select name="status" aria-label="Comment status"
										><option value="visible">Visible</option><option value="hidden">Hidden</option
										><option value="deleted">Deleted</option></select
									>
									<button type="submit">Apply</button>
								</form>
							</td>
						</tr>
					{:else}
						<tr><td colspan="3">No moderated comments.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
</div>

<style>
	section {
		margin-top: 0.7rem;
	}
	.details {
		max-width: 28rem;
		overflow-wrap: anywhere;
	}
	.action-form {
		display: flex;
		min-width: 12rem;
		gap: 0.25rem;
	}
	.action-form select {
		min-width: 7rem;
	}
	.section-gap {
		margin-top: 0.7rem;
		align-items: start;
	}
</style>
