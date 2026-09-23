<script lang="ts">
	import { onDestroy } from 'svelte';
	import type WebTorrent from 'webtorrent';
	import type { Torrent, TorrentFile } from 'webtorrent';
	import { formatBytes } from '$lib/format';

	interface Props {
		magnet: string;
		enabled: boolean;
		signedIn: boolean;
	}

	let { magnet, enabled, signedIn }: Props = $props();
	let client = $state<WebTorrent | null>(null);
	let torrent = $state<Torrent | null>(null);
	let status = $state('Stopped');
	let peers = $state(0);
	let files = $state<TorrentFile[]>([]);
	let interval: ReturnType<typeof setInterval> | null = null;

	async function start() {
		if (!enabled || !signedIn || client) return;
		status = 'Loading WebTorrent…';
		try {
			const { default: WebTorrentClient } = await import('webtorrent');
			client = new WebTorrentClient({ tracker: true, dht: true, lsd: true, webSeeds: true });
			client.on(
				'error',
				(cause) => (status = cause instanceof Error ? cause.message : String(cause))
			);
			torrent = client.add(magnet, { deselect: true }, (loaded) => {
				files = loaded.files;
				loaded.pause();
				status = 'Connected in observation mode';
			});
			torrent.on('peer', () => (peers = torrent?.numPeers ?? 0));
			torrent.on(
				'warning',
				(cause) => (status = cause instanceof Error ? cause.message : String(cause))
			);
			torrent.on(
				'error',
				(cause) => (status = cause instanceof Error ? cause.message : String(cause))
			);
			interval = setInterval(() => {
				if (!torrent) return;
				peers = torrent.numPeers;
				files = torrent.files;
			}, 1_000);
		} catch (cause) {
			status = cause instanceof Error ? cause.message : 'WebTorrent could not start.';
			client = null;
		}
	}

	function stop() {
		if (interval) clearInterval(interval);
		interval = null;
		client?.destroy();
		client = null;
		torrent = null;
		peers = 0;
		files = [];
		status = 'Stopped';
	}

	onDestroy(stop);
</script>

<div class="swarm panel">
	<div class="panel-pad stack">
		<div class="row-between wrap">
			<div>
				<strong>Browser peer panel</strong>
				<p class="small muted">Opt-in WebTorrent discovery. No payload is selected for download.</p>
			</div>
			{#if client}
				<button class="button-danger" type="button" onclick={stop}>Stop and disconnect</button>
			{:else}
				<button type="button" onclick={start} disabled={!enabled || !signedIn}
					>Start browser peer panel</button
				>
			{/if}
		</div>
		{#if !signedIn}<p class="notice">Log in to use browser peer discovery.</p>{/if}
		{#if !enabled}<p class="notice">Browser WebTorrent is disabled by the administrator.</p>{/if}
		{#if client}
			<div class="row wrap small">
				<span class="badge">{status}</span>
				<span>{peers} {peers === 1 ? 'peer' : 'peers'}</span>
				{#if torrent}<span>{formatBytes(torrent.downloadSpeed)}/s down</span><span
						>{formatBytes(torrent.uploadSpeed)}/s up</span
					>{/if}
			</div>
			{#if files.length}
				<details>
					<summary>Metadata files ({files.length})</summary>
					<ul class="file-list">
						{#each files.slice(0, 100) as file}<li>
								<span>{file.name}</span><span>{formatBytes(file.length)}</span>
							</li>{/each}
					</ul>
				</details>
			{/if}
		{/if}
		<p class="privacy small muted">
			Starting the peer panel can reveal your IP address to peers and trackers. Stop it before
			leaving if that matters.
		</p>
	</div>
</div>

<style>
	.swarm {
		margin-top: 0.7rem;
	}
	.swarm p {
		margin: 0;
	}
	.file-list {
		max-height: 15rem;
		overflow: auto;
		margin: 0.4rem 0 0;
		padding: 0 1rem 0 0;
		list-style: none;
	}
	.file-list li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		border-top: 1px solid var(--line);
		padding: 0.25rem 0;
	}
	summary {
		cursor: pointer;
	}
</style>
