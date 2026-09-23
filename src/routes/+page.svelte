<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';
	import { formatBytes, formatDate } from '$lib/format';

	let { data } = $props();

	function pageUrl(page: number) {
		const query = new URLSearchParams();
		if (data.query.search) query.set('q', data.query.search);
		if (data.query.category) query.set('category', data.query.category);
		if (data.query.tag) query.set('tag', data.query.tag);
		if (data.query.sort && data.query.sort !== 'newest') query.set('sort', data.query.sort);
		query.set('page', String(page));
		return `/?${query}`;
	}
</script>

<svelte:head><title>Browse torrents · {data.config.siteName}</title></svelte:head>

<div class="row-between wrap heading">
	<div>
		<h1>Latest torrents</h1>
		<p class="muted small">{data.total} public {data.total === 1 ? 'entry' : 'entries'}</p>
	</div>
	<form class="search-form" method="GET">
		<input
			name="q"
			value={data.query.search}
			placeholder="Search name or description"
			aria-label="Search torrents"
		/>
		{#if data.query.category}<input
				type="hidden"
				name="category"
				value={data.query.category}
			/>{/if}
		{#if data.query.tag}<input type="hidden" name="tag" value={data.query.tag} />{/if}
		<select name="sort" aria-label="Sort torrents">
			<option value="newest" selected={data.query.sort === 'newest'}>Newest</option>
			<option value="seeders" selected={data.query.sort === 'seeders'}>Seeders</option>
			<option value="name" selected={data.query.sort === 'name'}>Name</option>
			<option value="size_desc" selected={data.query.sort === 'size_desc'}>Largest</option>
			<option value="oldest" selected={data.query.sort === 'oldest'}>Oldest</option>
		</select>
		<button type="submit">Search</button>
	</form>
</div>

<div class="filters panel">
	<div class="filter-row">
		<strong>Categories</strong>
		<a class:active={!data.query.category} href="/?q={encodeURIComponent(data.query.search)}">All</a
		>
		{#each data.categories as category}
			<a
				class:active={data.query.category === category.slug}
				href="/?category={category.slug}&q={encodeURIComponent(data.query.search)}"
			>
				{category.name}
			</a>
		{/each}
	</div>
	{#if data.popularTags.length}
		<div class="filter-row">
			<strong>Tags</strong>
			{#each data.popularTags as tag}
				<a
					class:active={data.query.tag === tag.name}
					href="/?tag={encodeURIComponent(tag.name)}&q={encodeURIComponent(data.query.search)}"
				>
					{tag.name}
				</a>
			{/each}
		</div>
	{/if}
</div>

<div class="panel table-wrap">
	<table>
		<thead>
			<tr>
				<th class="type-column">Type</th>
				<th>Name</th>
				<th class="numeric">Size</th>
				<th class="numeric">Seed</th>
				<th class="numeric optional">Leech</th>
				<th class="date-column">Uploaded</th>
				<th class="uploader-column">Uploader</th>
			</tr>
		</thead>
		<tbody>
			{#each data.items as torrent}
				<tr>
					<td class="type-column"
						><span class="badge">{torrent.sourceType === 'magnet' ? 'Magnet' : 'Torrent'}</span></td
					>
					<td>
						<a class="torrent-name" href={`/torrents/${torrent.id}`}>{torrent.name}</a>
						<div class="meta">
							<a href="/?category={torrent.categorySlug}">{torrent.category}</a>
							{#each torrent.tags.slice(0, 4) as tag}<a href="/?tag={encodeURIComponent(tag)}"
									>{tag}</a
								>{/each}
						</div>
					</td>
					<td class="numeric">{formatBytes(torrent.sizeBytes)}</td>
					<td class="numeric"><span class:good={torrent.seeders > 0}>{torrent.seeders}</span></td>
					<td class="numeric optional">{torrent.leechers}</td>
					<td class="date-column small">{formatDate(torrent.createdAt)}</td>
					<td class="uploader-column">
						<a class="uploader" href={`/users/${torrent.uploader}`}>
							<Avatar seed={torrent.uploader} size={22} alt="" />
							{torrent.uploader}
						</a>
					</td>
				</tr>
			{:else}
				<tr><td colspan="7" class="empty">No torrents match these filters.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

{#if data.pages > 1}
	<nav class="pagination" aria-label="Pagination">
		{#if data.page > 1}<a class="button" href={pageUrl(data.page - 1)}>Previous</a>{:else}<span
			></span>{/if}
		<span class="small">Page {data.page} of {data.pages}</span>
		{#if data.page < data.pages}<a class="button" href={pageUrl(data.page + 1)}>Next</a>{:else}<span
			></span>{/if}
	</nav>
{/if}

<style>
	.heading {
		margin-bottom: 0.65rem;
	}
	.heading p {
		margin: 0;
	}
	.filters {
		margin-bottom: 0.55rem;
		padding: 0.45rem 0.55rem;
	}
	.filter-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.45rem;
		padding: 0.16rem 0;
	}
	.filter-row strong {
		width: 4.5rem;
		font-size: 0.72rem;
		text-transform: uppercase;
	}
	.torrent-name {
		font-weight: 700;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: 0.12rem;
		font-size: 0.72rem;
	}
	.good {
		color: var(--success);
		font-weight: 700;
	}
	.uploader {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}
	.empty {
		padding: 2rem;
		color: var(--muted);
		text-align: center;
	}
	.pagination {
		margin-top: 0.65rem;
	}
	@media (max-width: 760px) {
		.search-form {
			width: 100%;
		}
		.search-form input {
			min-width: 0;
		}
		.type-column {
			width: 4.2rem;
		}
	}
</style>
