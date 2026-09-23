import { fail, redirect } from '@sveltejs/kit';
import { email, password, text, username } from '$lib/validation';
import { createFirstAdmin, createSession, setSessionCookie } from '$lib/server/auth';
import { getDatabase } from '$lib/server/db';
import { saveConfig } from '$lib/server/config';
import { audit, consumeRateLimit } from '$lib/server/security';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ ready: true });

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const database = getDatabase();
		if (!consumeRateLimit(database, 'setup', getClientAddress(), 5, 60 * 60 * 1000)) {
			return fail(429, {
				error: 'Too many setup attempts. Try again later.',
				values: { siteName: '', dmcaEmail: '', username: '', email: '' }
			});
		}
		const form = await request.formData();
		const siteName = text(form.get('siteName'), 60);
		const dmcaEmail = email(form.get('dmcaEmail'));
		const adminUsername = username(form.get('username'));
		const adminEmail = email(form.get('email'));
		const adminPassword = password(form.get('password'));
		if (!siteName || !dmcaEmail || !adminUsername || !adminEmail || !adminPassword) {
			return fail(400, {
				error:
					'Enter a valid site name, contact email, username, email address, and 12+ character password.',
				values: { siteName, dmcaEmail, username: adminUsername ?? '', email: adminEmail ?? '' }
			});
		}
		if (adminPassword !== String(form.get('confirmPassword'))) {
			return fail(400, {
				error: 'Passwords do not match.',
				values: { siteName, dmcaEmail, username: adminUsername, email: adminEmail }
			});
		}
		let userId: number;
		try {
			userId = await createFirstAdmin(database, {
				username: adminUsername,
				email: adminEmail,
				password: adminPassword
			});
		} catch {
			return fail(409, {
				error: 'Setup has already been completed.',
				values: { siteName: '', dmcaEmail: '', username: '', email: '' }
			});
		}
		saveConfig(
			{ siteName, dmcaEmail, registrationEnabled: false, inviteOnly: true },
			userId,
			database
		);
		const session = createSession(database, userId, 30);
		setSessionCookie(cookies, session.token, session.expiresAt);
		audit(database, userId, 'setup.completed', 'site', '1', { username: adminUsername });
		redirect(303, '/admin');
	}
};
