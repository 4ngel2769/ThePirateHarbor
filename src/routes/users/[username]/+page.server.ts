import { error } from '@sveltejs/kit';
import { getDatabase } from '$lib/server/db';
import { getUserProfile, listTorrents } from '$lib/server/torrents';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url, locals }) => {
	const profile = getUserProfile(getDatabase(), params.username);
	if (!profile) error(404, 'User not found');
	const page = Math.max(Number(url.searchParams.get('page')) || 1, 1);
	return {
		profile,
		torrents: listTorrents(getDatabase(), {
			uploaderId: profile.id,
			page,
			limit: locals.config.itemsPerPage
		})
	};
};
