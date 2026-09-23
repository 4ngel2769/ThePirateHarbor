import { fail } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { getDatabase } from '$lib/server/db';
import {
	getModerationContent,
	getReports,
	setCommentStatus,
	setReportStatus,
	setTorrentStatus
} from '$lib/server/admin';
import type { TorrentStatus } from '$lib/types';
import { integer } from '$lib/validation';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireUser(locals, ['moderator', 'admin']);
	const database = getDatabase();
	return { reports: getReports(database), content: getModerationContent(database) };
};

export const actions: Actions = {
	report: async ({ request, locals }) => {
		const user = requireUser(locals, ['moderator', 'admin']);
		const form = await request.formData();
		const reportId = integer(form.get('reportId'), 1, 1_000_000_000);
		const status = String(form.get('status')) as 'open' | 'reviewing' | 'resolved' | 'dismissed';
		if (!reportId || !['open', 'reviewing', 'resolved', 'dismissed'].includes(status)) {
			return fail(400, { success: '', error: 'Invalid report action.' });
		}
		try {
			setReportStatus(getDatabase(), user.id, reportId, status);
		} catch (cause) {
			return fail(400, {
				success: '',
				error: cause instanceof Error ? cause.message : 'Report could not be updated.'
			});
		}
		return { success: 'Report updated.', error: '' };
	},
	torrent: async ({ request, locals }) => {
		const user = requireUser(locals, ['moderator', 'admin']);
		const form = await request.formData();
		const torrentId = integer(form.get('torrentId'), 1, 1_000_000_000);
		const status = String(form.get('status')) as TorrentStatus;
		if (!torrentId || !['visible', 'hidden', 'removed'].includes(status)) {
			return fail(400, { success: '', error: 'Invalid torrent action.' });
		}
		try {
			setTorrentStatus(getDatabase(), user.id, user.role, torrentId, status);
		} catch (cause) {
			return fail(400, {
				success: '',
				error: cause instanceof Error ? cause.message : 'Torrent could not be updated.'
			});
		}
		return { success: 'Torrent updated.', error: '' };
	},
	comment: async ({ request, locals }) => {
		const user = requireUser(locals, ['moderator', 'admin']);
		const form = await request.formData();
		const commentId = integer(form.get('commentId'), 1, 1_000_000_000);
		const status = String(form.get('status')) as 'visible' | 'hidden' | 'deleted';
		if (!commentId || !['visible', 'hidden', 'deleted'].includes(status)) {
			return fail(400, { success: '', error: 'Invalid comment action.' });
		}
		try {
			setCommentStatus(getDatabase(), user.id, commentId, status);
		} catch (cause) {
			return fail(400, {
				success: '',
				error: cause instanceof Error ? cause.message : 'Comment could not be updated.'
			});
		}
		return { success: 'Comment updated.', error: '' };
	}
};
