import { fail, redirect } from '@sveltejs/kit';
import { authenticate, createSession, setSessionCookie } from '$lib/server/auth';
import { getDatabase } from '$lib/server/db';
import { consumeRateLimit } from '$lib/server/security';
import { text } from '$lib/validation';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress, locals }) => {
		const form = await request.formData();
		const username = text(form.get('username'), 32);
		const password = String(form.get('password') ?? '');
		if (!username || !password)
			return fail(400, { error: 'Enter your username and password.', username });
		const key = getClientAddress();
		if (!consumeRateLimit(getDatabase(), 'login', key, 10, 15 * 60 * 1000)) {
			return fail(429, { error: 'Too many login attempts. Try again later.', username });
		}
		const user = await authenticate(getDatabase(), username, password);
		if (!user) return fail(400, { error: 'Invalid username or password.', username });
		const session = createSession(getDatabase(), user.id, locals.config.sessionExpiryDays);
		setSessionCookie(cookies, session.token, session.expiresAt);
		redirect(303, '/');
	}
};
