import adapter from 'svelte-adapter-bun';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter(),
			compilerOptions: { runes: true },
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'base-uri': ['self'],
					'connect-src': ['self', 'https:', 'wss:'],
					'font-src': ['self'],
					'form-action': ['self'],
					'frame-ancestors': ['none'],
					'img-src': ['self', 'data:', 'https://blobatar.dev'],
					'media-src': ['self', 'blob:'],
					'object-src': ['none'],
					'script-src': ['self'],
					'style-src': ['self'],
					'worker-src': ['self', 'blob:']
				}
			}
		})
	]
});
