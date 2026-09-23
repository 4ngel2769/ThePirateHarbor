import { fail } from '@sveltejs/kit';
import { createInvite, requireUser } from '$lib/server/auth';
import { getDatabase } from '$lib/server/db';
import { saveConfig } from '$lib/server/config';
import {
	createCategory,
	getAdminStats,
	getAuditLogs,
	getInvites,
	getTakedowns,
	getUsers,
	revokeInvite,
	setTakedownStatus,
	updateUserAccess
} from '$lib/server/admin';
import { getCategories } from '$lib/server/torrents';
import { audit } from '$lib/server/security';
import { email, integer, role, text } from '$lib/validation';
import type { Role, UserStatus } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireUser(locals, ['admin']);
	const database = getDatabase();
	return {
		stats: getAdminStats(database),
		users: getUsers(database),
		invites: getInvites(database),
		categories: getCategories(database),
		takedowns: getTakedowns(database),
		auditLogs: getAuditLogs(database)
	};
};

export const actions: Actions = {
	invite: async ({ request, locals, url }) => {
		const user = requireUser(locals, ['admin']);
		const form = await request.formData();
		const expiryDays = integer(form.get('expiryDays'), 1, 90) ?? locals.config.inviteExpiryDays;
		const invite = createInvite(getDatabase(), user.id, expiryDays);
		audit(getDatabase(), user.id, 'invite.created', 'invite', null, {
			expiresAt: invite.expiresAt
		});
		return {
			success: 'Invite created. Copy the link now; the raw token is not stored.',
			error: '',
			inviteUrl: `${url.origin}/invite/${invite.token}`,
			inviteExpiresAt: invite.expiresAt
		};
	},
	revokeInvite: async ({ request, locals }) => {
		const user = requireUser(locals, ['admin']);
		const inviteId = integer((await request.formData()).get('inviteId'), 1, 1_000_000_000);
		if (!inviteId) return fail(400, { success: '', error: 'Invalid invite.' });
		try {
			revokeInvite(getDatabase(), user.id, inviteId);
		} catch (cause) {
			return fail(400, {
				success: '',
				error: cause instanceof Error ? cause.message : 'Invite could not be revoked.'
			});
		}
		return { success: 'Invite revoked.', error: '' };
	},
	settings: async ({ request, locals }) => {
		const user = requireUser(locals, ['admin']);
		const form = await request.formData();
		const siteName = text(form.get('siteName'), 60);
		const dmcaEmail = email(form.get('dmcaEmail'));
		const numeric = {
			itemsPerPage: integer(form.get('itemsPerPage'), 10, 100),
			maxTorrentFileBytes: integer(form.get('maxTorrentFileBytes'), 1_024, 10 * 1024 * 1024),
			maxMagnetLength: integer(form.get('maxMagnetLength'), 128, 16 * 1024),
			maxTitleLength: integer(form.get('maxTitleLength'), 20, 500),
			maxDescriptionLength: integer(form.get('maxDescriptionLength'), 100, 20_000),
			maxCommentLength: integer(form.get('maxCommentLength'), 50, 5_000),
			maxReportLength: integer(form.get('maxReportLength'), 50, 5_000),
			maxTags: integer(form.get('maxTags'), 1, 30),
			maxUploadsPerHour: integer(form.get('maxUploadsPerHour'), 1, 100),
			maxUploadsPerDay: integer(form.get('maxUploadsPerDay'), 1, 1_000),
			maxUploadsPerUser: integer(form.get('maxUploadsPerUser'), 1, 100_000),
			inviteExpiryDays: integer(form.get('inviteExpiryDays'), 1, 90),
			sessionExpiryDays: integer(form.get('sessionExpiryDays'), 1, 365)
		};
		if (!siteName || !dmcaEmail || Object.values(numeric).some((value) => value === null)) {
			return fail(400, {
				success: '',
				error: 'One or more settings are outside the allowed range.'
			});
		}
		const values = {
			siteName,
			dmcaEmail,
			registrationEnabled: false,
			inviteOnly: true,
			webTorrentEnabled: form.get('webTorrentEnabled') === 'on',
			...numeric
		};
		saveConfig(values, user.id, getDatabase());
		audit(getDatabase(), user.id, 'settings.updated', 'config', 'site', {
			keys: Object.keys(values)
		});
		return { success: 'Settings saved.', error: '' };
	},
	user: async ({ request, locals }) => {
		const actor = requireUser(locals, ['admin']);
		const form = await request.formData();
		const userId = integer(form.get('userId'), 1, 1_000_000_000);
		const nextRole = role(form.get('role'));
		const status = text(form.get('status'), 20) as UserStatus;
		if (!userId || !nextRole || !['active', 'suspended', 'banned'].includes(status)) {
			return fail(400, { success: '', error: 'Invalid user access settings.' });
		}
		try {
			updateUserAccess(getDatabase(), actor.id, userId, nextRole as Role, status);
		} catch (cause) {
			return fail(400, {
				success: '',
				error: cause instanceof Error ? cause.message : 'User could not be updated.'
			});
		}
		return { success: 'User access updated.', error: '' };
	},
	category: async ({ request, locals }) => {
		const user = requireUser(locals, ['admin']);
		const form = await request.formData();
		const name = text(form.get('name'), 40);
		const position = integer(form.get('position'), 0, 10_000) ?? 0;
		if (!name) return fail(400, { success: '', error: 'Enter a category name.' });
		try {
			createCategory(getDatabase(), user.id, name, position);
		} catch {
			return fail(409, { success: '', error: 'That category already exists.' });
		}
		return { success: 'Category created.', error: '' };
	},
	takedown: async ({ request, locals }) => {
		const user = requireUser(locals, ['admin']);
		const form = await request.formData();
		const takedownId = integer(form.get('takedownId'), 1, 1_000_000_000);
		const status = text(form.get('status'), 20) as 'open' | 'reviewing' | 'resolved' | 'rejected';
		const note = text(form.get('note'), 1_000);
		if (!takedownId || !['open', 'reviewing', 'resolved', 'rejected'].includes(status)) {
			return fail(400, { success: '', error: 'Invalid takedown action.' });
		}
		try {
			setTakedownStatus(getDatabase(), user.id, takedownId, status, note);
		} catch (cause) {
			return fail(400, {
				success: '',
				error: cause instanceof Error ? cause.message : 'Takedown could not be updated.'
			});
		}
		return { success: 'Takedown updated.', error: '' };
	}
};
