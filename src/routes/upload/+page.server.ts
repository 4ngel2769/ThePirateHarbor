import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { getDatabase } from '$lib/server/db';
import { createTorrent, getCategories } from '$lib/server/torrents';
import { consumeRateLimit } from '$lib/server/security';
import { integer, tags, text } from '$lib/validation';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireUser(locals);
	return { categories: getCategories(getDatabase()) };
};

export const actions: Actions = {
	default: async ({ request, locals, getClientAddress }) => {
		const user = requireUser(locals);
		const database = getDatabase();
		if (
			!consumeRateLimit(database, 'upload', `${getClientAddress()}:${user.id}`, 10, 60 * 60 * 1000)
		) {
			return fail(429, { error: 'Too many upload attempts. Try again later.' });
		}
		const form = await request.formData();
		const sourceType = form.get('sourceType') === 'torrent' ? 'torrent' : 'magnet';
		const title = text(form.get('title'), locals.config.maxTitleLength);
		const description = text(form.get('description'), locals.config.maxDescriptionLength);
		const categoryId = integer(form.get('categoryId'), 1, 1_000_000);
		const tagList = tags(form.get('tags'), locals.config.maxTags);
		if (!title || !categoryId) return fail(400, { error: 'A title and category are required.' });
		let magnet: string | undefined;
		let torrentBytes: Uint8Array | undefined;
		if (sourceType === 'magnet') magnet = text(form.get('magnet'), locals.config.maxMagnetLength);
		else {
			const file = form.get('torrentFile');
			if (!(file instanceof File) || file.size === 0)
				return fail(400, { error: 'Choose a .torrent file.' });
			if (file.size > locals.config.maxTorrentFileBytes) {
				return fail(413, { error: 'The .torrent file exceeds the configured upload limit.' });
			}
			torrentBytes = new Uint8Array(await file.arrayBuffer());
		}
		let id: number;
		try {
			id = await createTorrent(database, {
				uploaderId: user.id,
				title,
				description,
				categoryId,
				tags: tagList,
				sourceType,
				magnet,
				torrentBytes,
				maxFileBytes: locals.config.maxTorrentFileBytes,
				maxMagnetLength: locals.config.maxMagnetLength,
				limits: {
					hour: locals.config.maxUploadsPerHour,
					day: locals.config.maxUploadsPerDay,
					total: locals.config.maxUploadsPerUser
				}
			});
		} catch (cause) {
			return fail(400, {
				error: cause instanceof Error ? cause.message : 'The torrent could not be parsed.'
			});
		}
		redirect(303, `/torrents/${id}`);
	}
};
