import { error } from '@sveltejs/kit';
import { canModerate, requireUser } from '$lib/server/auth';
import { getDatabase } from '$lib/server/db';
import { getTorrentBlob } from '$lib/server/torrents';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params, locals }) => {
	requireUser(locals);
	const id = Number(params.id);
	if (!Number.isInteger(id) || id < 1) error(404, 'Torrent not found');
	const row = getTorrentBlob(getDatabase(), id, canModerate(locals.user));
	if (!row?.torrentBlob) error(404, 'Torrent file not found');
	const filename = row.name.replace(/[^a-z0-9._-]+/gi, '_').slice(0, 100) || 'download.torrent';
	const bytes = new Uint8Array(row.torrentBlob.byteLength);
	bytes.set(row.torrentBlob);
	return new Response(bytes.buffer, {
		headers: {
			'Content-Type': 'application/x-bittorrent',
			'Content-Disposition': `attachment; filename="${filename}.torrent"; filename*=UTF-8''${encodeURIComponent(`${filename}.torrent`)}`,
			'Cache-Control': 'private, max-age=300',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
