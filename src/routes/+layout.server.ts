import { redirect } from '@sveltejs/kit';
import { getDatabase } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const count = getDatabase().prepare('SELECT COUNT(*) AS count FROM users').get() as {
		count: number;
	};
	if (count.count === 0 && url.pathname !== '/setup') redirect(303, '/setup');
	if (count.count > 0 && url.pathname === '/setup') redirect(303, '/');
	return { user: locals.user, config: locals.config };
};
