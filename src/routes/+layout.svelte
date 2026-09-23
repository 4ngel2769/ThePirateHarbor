<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import Avatar from '$lib/components/Avatar.svelte';

	let { data, children } = $props();
	let theme = $state<'light' | 'dark' | ''>('');

	onMount(() => {
		theme = localStorage.getItem('tph-theme') === 'dark' ? 'dark' : 'light';
		document.documentElement.dataset.theme = theme;
	});

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = theme;
		localStorage.setItem('tph-theme', theme);
	}
</script>

<svelte:head>
	<title>{data.config.siteName}</title>
	<meta
		name="description"
		content="A compact, invite-only torrent index for discovering and sharing torrent metadata."
	/>
</svelte:head>

<header class="topbar">
	<div class="topbar-inner">
		<a class="brand" href="/">{data.config.siteName}</a>
		<nav aria-label="Primary navigation">
			<a href="/">Browse</a>
			{#if data.user}
				<a href="/upload">Upload</a>
				<a href={`/users/${data.user.username}`}>Profile</a>
				{#if data.user.role === 'moderator' || data.user.role === 'admin'}
					<a href="/moderation">Moderate</a>
				{/if}
				{#if data.user.role === 'admin'}<a href="/admin">Admin</a>{/if}
			{:else}
				<a href="/login">Log in</a>
			{/if}
		</nav>
		<div class="account">
			<button class="button-quiet" type="button" onclick={toggleTheme}>
				{theme === 'dark' ? 'Light' : 'Dark'}
			</button>
			{#if data.user}
				<a class="user-chip" href={`/users/${data.user.username}`}>
					<Avatar seed={data.user.username} size={24} alt="" />
					<span>{data.user.username}</span>
				</a>
				<form method="POST" action="/logout" class="inline-form">
					<button type="submit">Log out</button>
				</form>
			{/if}
		</div>
	</div>
</header>

<main class="page">
	{@render children()}
</main>

<footer class="footer">
	<div>
		<a href="/dmca">DMCA</a>
		<span>Metadata index only. Respect applicable law and content rights.</span>
	</div>
</footer>

<style>
	.topbar {
		border-bottom: 1px solid var(--line-strong);
		background: var(--surface);
	}

	.topbar-inner,
	.footer > div {
		display: flex;
		width: min(1480px, calc(100% - 1.5rem));
		min-height: 38px;
		align-items: center;
		gap: 1rem;
		margin: 0 auto;
	}

	.brand {
		color: var(--accent);
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		text-transform: uppercase;
	}

	nav {
		display: flex;
		align-items: center;
		gap: 0.8rem;
	}

	.account {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-left: auto;
	}

	.user-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--text);
		font-weight: 700;
	}

	.footer {
		border-top: 1px solid var(--line);
		background: var(--surface);
		color: var(--muted);
	}

	.footer > div {
		min-height: 44px;
		justify-content: space-between;
		font-size: 0.76rem;
	}

	@media (max-width: 760px) {
		.topbar-inner,
		.footer > div {
			width: calc(100% - 0.75rem);
			gap: 0.55rem;
		}

		nav {
			gap: 0.45rem;
			font-size: 0.78rem;
		}

		.user-chip span,
		.footer span {
			display: none;
		}
	}
</style>
