import { fail } from '@sveltejs/kit';
import { getDatabase } from '$lib/server/db';
import { audit, consumeRateLimit } from '$lib/server/security';
import { email, integer, text } from '$lib/validation';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => ({ dmcaEmail: locals.config.dmcaEmail });

export const actions: Actions = {
	default: async ({ request, locals, getClientAddress }) => {
		if (!consumeRateLimit(getDatabase(), 'dmca', getClientAddress(), 3, 24 * 60 * 60 * 1000)) {
			return fail(429, { success: '', error: 'Daily notice submission limit reached.' });
		}
		const form = await request.formData();
		const requesterName = text(form.get('requesterName'), 120);
		const requesterEmail = email(form.get('requesterEmail'));
		const originalUrl = text(form.get('originalUrl'), 1_000);
		const infoHash = text(form.get('infoHash'), 40).toLowerCase();
		const statement = text(form.get('statement'), 5_000);
		const torrentId = integer(form.get('torrentId'), 1, 1_000_000_000) ?? null;
		if (
			!requesterName ||
			!requesterEmail ||
			statement.length < 100 ||
			(!originalUrl && !infoHash && !torrentId)
		) {
			return fail(400, {
				success: '',
				error: 'Provide contact details, a target, and a statement of at least 100 characters.'
			});
		}
		if (infoHash && !/^[a-f0-9]{40}$/.test(infoHash)) {
			return fail(400, {
				success: '',
				error: 'The info hash must contain exactly 40 hexadecimal characters.'
			});
		}
		if (torrentId) {
			const torrent = getDatabase()
				.prepare("SELECT id FROM torrents WHERE id = ? AND status = 'visible'")
				.get(torrentId);
			if (!torrent) return fail(404, { success: '', error: 'Torrent not found.' });
		}
		const result = getDatabase()
			.prepare(
				'INSERT INTO legal_takedowns (requester_name, requester_email, torrent_id, info_hash, original_url, statement) VALUES (?, ?, ?, ?, ?, ?)'
			)
			.run(
				requesterName,
				requesterEmail,
				torrentId,
				infoHash || null,
				originalUrl || null,
				statement
			);
		audit(
			getDatabase(),
			locals.user?.id ?? null,
			'dmca.submitted',
			'legal_takedown',
			Number(result.lastInsertRowid),
			{
				torrentId,
				infoHash: infoHash || null
			}
		);
		return { success: 'Notice submitted for administrator review.', error: '' };
	}
};
