import { error, fail } from '@sveltejs/kit';
import { canModerate, requireUser } from '$lib/server/auth';
import { getDatabase } from '$lib/server/db';
import { addComment, createReport, getComments, getTorrent } from '$lib/server/torrents';
import { audit, consumeRateLimit } from '$lib/server/security';
import { integer, text } from '$lib/validation';
import type { Actions, PageServerLoad } from './$types';

function torrentId(value: string) {
	const id = Number(value);
	if (!Number.isInteger(id) || id < 1) error(404, 'Torrent not found');
	return id;
}

export const load: PageServerLoad = ({ params, locals }) => {
	const id = torrentId(params.id);
	const database = getDatabase();
	const includeHidden = canModerate(locals.user);
	const torrent = getTorrent(database, id, includeHidden);
	if (!torrent) error(404, 'Torrent not found');
	const { torrentBlob, ...publicTorrent } = torrent;
	void torrentBlob;
	return {
		torrent: publicTorrent,
		comments: getComments(database, id, includeHidden)
	};
};

export const actions: Actions = {
	comment: async ({ request, params, locals, getClientAddress }) => {
		const user = requireUser(locals);
		const id = torrentId(params.id);
		if (
			!consumeRateLimit(
				getDatabase(),
				'comment',
				`${getClientAddress()}:${user.id}`,
				10,
				60 * 60 * 1000
			)
		) {
			return fail(429, { error: 'Too many comments. Try again later.' });
		}
		const form = await request.formData();
		const body = text(form.get('body'), locals.config.maxCommentLength);
		if (!body) return fail(400, { error: 'Comment cannot be empty.' });
		try {
			addComment(getDatabase(), id, user.id, body);
			audit(getDatabase(), user.id, 'comment.created', 'torrent', id);
		} catch {
			return fail(404, { error: 'Torrent not found.' });
		}
		return { success: 'Comment posted.' };
	},
	report: async ({ request, params, locals, getClientAddress }) => {
		const user = requireUser(locals);
		const id = torrentId(params.id);
		if (
			!consumeRateLimit(
				getDatabase(),
				'report',
				`${getClientAddress()}:${user.id}`,
				5,
				24 * 60 * 60 * 1000
			)
		) {
			return fail(429, { error: 'Report limit reached. Try again later.' });
		}
		const form = await request.formData();
		const reason = text(form.get('reason'), 40);
		const details = text(form.get('details'), locals.config.maxReportLength);
		const commentId = integer(form.get('commentId'), 1, 1_000_000_000) ?? undefined;
		if (!['copyright', 'malware', 'spam', 'other'].includes(reason) || !details) {
			return fail(400, { error: 'Choose a report reason and enter details.' });
		}
		if (commentId) {
			const comment = getDatabase()
				.prepare('SELECT id FROM comments WHERE id = ? AND torrent_id = ?')
				.get(commentId, id);
			if (!comment) return fail(400, { error: 'Invalid comment report target.' });
		}
		try {
			createReport(getDatabase(), {
				reporterId: user.id,
				torrentId: id,
				commentId,
				reason,
				details
			});
		} catch {
			return fail(404, { error: 'Torrent not found.' });
		}
		return { success: 'Report submitted for moderator review.' };
	}
};
