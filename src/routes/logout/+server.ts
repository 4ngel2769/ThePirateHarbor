import { redirect } from '@sveltejs/kit';
import { clearSessionCookie, revokeSession, SESSION_COOKIE } from '$lib/server/auth';
import { getDatabase } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ cookies }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (token) revokeSession(getDatabase(), token);
	clearSessionCookie(cookies);
	redirect(303, '/');
};
