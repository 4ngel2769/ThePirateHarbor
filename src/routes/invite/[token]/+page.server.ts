import { fail, redirect } from '@sveltejs/kit';
import {
	createAccountFromInvite,
	createSession,
	getValidInvite,
	setSessionCookie
} from '$lib/server/auth';
import { getDatabase } from '$lib/server/db';
import { audit, consumeRateLimit } from '$lib/server/security';
import { email, password, username } from '$lib/validation';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	if (locals.user) redirect(303, '/');
	return { valid: Boolean(getValidInvite(getDatabase(), params.token)) };
};

export const actions: Actions = {
	default: async ({ request, cookies, params, locals }) => {
		const form = await request.formData();
		const accountUsername = username(form.get('username'));
		const accountEmail = email(form.get('email'));
		const accountPassword = password(form.get('password'));
		if (!accountUsername || !accountEmail || !accountPassword) {
			return fail(400, {
				error: 'Enter a valid username, email address, and 12+ character password.'
			});
		}
		if (accountPassword !== String(form.get('confirmPassword'))) {
			return fail(400, { error: 'Passwords do not match.' });
		}
		if (!consumeRateLimit(getDatabase(), 'invite', params.token, 8, 60 * 60 * 1000)) {
			return fail(429, { error: 'Too many attempts for this invite.' });
		}
		let userId: number;
		try {
			userId = await createAccountFromInvite(getDatabase(), params.token, {
				username: accountUsername,
				email: accountEmail,
				password: accountPassword
			});
		} catch (cause) {
			const duplicate = cause instanceof Error && cause.message.includes('UNIQUE');
			return fail(duplicate ? 409 : 400, {
				error: duplicate
					? 'That username or email is already registered.'
					: 'This invite is invalid or expired.'
			});
		}
		const session = createSession(getDatabase(), userId, locals.config.sessionExpiryDays);
		setSessionCookie(cookies, session.token, session.expiresAt);
		audit(getDatabase(), userId, 'invite.accepted', 'user', userId);
		redirect(303, '/');
	}
};
