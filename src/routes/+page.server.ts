import { text } from '$lib/validation';
import { getCategories, getPopularTags, listTorrents } from '$lib/server/torrents';
import { getDatabase } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url, locals }) => {
	const search = text(url.searchParams.get('q'), 100);
	const category = text(url.searchParams.get('category'), 40);
	const tag = text(url.searchParams.get('tag'), 40);
	const sort = text(url.searchParams.get('sort'), 20);
	const page = Math.max(Number(url.searchParams.get('page')) || 1, 1);
	return {
		...listTorrents(getDatabase(), {
			search,
			category,
			tag,
			sort,
			page,
			limit: locals.config.itemsPerPage
		}),
		categories: getCategories(getDatabase()),
		popularTags: getPopularTags(getDatabase()),
		query: { search, category, tag, sort }
	};
};
