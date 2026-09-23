<script lang="ts">
	import { avatarUrl } from '$lib/format';

	let { seed, size = 32, alt = '' }: { seed: string; size?: number; alt?: string } = $props();
</script>

<img class="avatar" src={avatarUrl(seed, size)} width={size} height={size} {alt} />

<style>
	.avatar {
		display: block;
		flex: 0 0 auto;
		background: var(--surface-alt);
		object-fit: cover;
	}
</style>
