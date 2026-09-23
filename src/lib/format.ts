export function formatBytes(value: number) {
	if (!Number.isFinite(value) || value <= 0) return '0 B';
	const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
	const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
	return `${(value / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatDate(value: string) {
	return new Intl.DateTimeFormat('en', {
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(new Date(value));
}

export function avatarUrl(seed: string, size = 48) {
	return `https://blobatar.dev/avatar/${encodeURIComponent(seed)}?size=${size}&background=squircle`;
}
