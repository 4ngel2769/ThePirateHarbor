import { getDatabase } from '$lib/server/db';
import { getSessionUser, SESSION_COOKIE } from '$lib/server/auth';
import { getConfig } from '$lib/server/config';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const database = getDatabase();
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = token ? getSessionUser(database, token) : null;
	event.locals.config = getConfig(database);
	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	if (process.env.TPH_HTTPS === '1') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
	);
	return response;
};
