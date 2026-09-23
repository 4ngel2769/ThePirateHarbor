<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';
	import { formatBytes, formatDate } from '$lib/format';

	let { data } = $props();
</script>

<svelte:head><title>{data.profile.username} · {data.config.siteName}</title></svelte:head>

<div class="profile panel panel-pad">
	<div class="profile-head">
		<Avatar seed={data.profile.username} size={72} alt="" />
		<div>
			<h1>{data.profile.username}</h1>
			<div class="row wrap">
				<span class="badge">{data.profile.role}</span>
				{#if data.profile.status !== 'active'}<span class="badge badge-warning"
						>{data.profile.status}</span
					>{/if}
				<span class="small muted">Joined {formatDate(data.profile.createdAt)}</span>
			</div>
		</div>
		<div class="counts">
			<div><strong>{data.profile.torrents}</strong><span>Uploads</span></div>
			<div><strong>{data.profile.comments}</strong><span>Comments</span></div>
		</div>
	</div>
</div>

<h2>Uploads</h2>
<div class="panel table-wrap">
	<table>
		<thead
			><tr
				><th>Name</th><th class="numeric">Size</th><th class="numeric">Seed</th><th>Uploaded</th
				></tr
			></thead
		>
		<tbody>
			{#each data.torrents.items as torrent}
				<tr>
					<td
						><a href={`/torrents/${torrent.id}`}>{torrent.name}</a>
						<div class="small muted">{torrent.category}</div></td
					>
					<td class="numeric">{formatBytes(torrent.sizeBytes)}</td>
					<td class="numeric">{torrent.seeders}</td>
					<td>{formatDate(torrent.createdAt)}</td>
				</tr>
			{:else}
				<tr><td colspan="4" class="empty">No public uploads.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

{#if data.torrents.pages > 1}
	<nav class="pagination">
		{#if data.torrents.page > 1}<a class="button" href={`?page=${data.torrents.page - 1}`}
				>Previous</a
			>{:else}<span></span>{/if}
		<span>Page {data.torrents.page} of {data.torrents.pages}</span>
		{#if data.torrents.page < data.torrents.pages}<a
				class="button"
				href={`?page=${data.torrents.page + 1}`}>Next</a
			>{:else}<span></span>{/if}
	</nav>
{/if}

<style>
	.profile {
		margin-bottom: 0.8rem;
	}
	.profile-head {
		display: flex;
		align-items: center;
		gap: 0.8rem;
	}
	.profile-head h1 {
		margin-bottom: 0.2rem;
	}
	.counts {
		display: flex;
		gap: 1.2rem;
		margin-left: auto;
	}
	.counts div {
		display: grid;
		text-align: center;
	}
	.counts strong {
		font-size: 1.15rem;
	}
	.counts span {
		color: var(--muted);
		font-size: 0.7rem;
		text-transform: uppercase;
	}
	.empty {
		padding: 1.5rem;
		color: var(--muted);
		text-align: center;
	}
	.pagination {
		margin-top: 0.6rem;
	}
	@media (max-width: 620px) {
		.profile-head {
			align-items: flex-start;
			flex-wrap: wrap;
		}
		.counts {
			width: 100%;
			margin-left: 0;
		}
	}
</style>
