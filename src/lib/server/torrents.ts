import type { Database } from 'bun:sqlite';
import parseTorrent, { toMagnetURI } from 'parse-torrent';
import { audit, nowIso } from './security';

export type TorrentListItem = {
	id: number;
	infoHash: string;
	name: string;
	sizeBytes: number;
	sourceType: 'magnet' | 'torrent';
	seeders: number;
	leechers: number;
	createdAt: string;
	category: string;
	categorySlug: string;
	uploader: string;
	tags: string[];
};

export type TorrentDetail = TorrentListItem & {
	description: string;
	magnetUri: string;
	status: 'visible' | 'hidden' | 'removed';
	fileManifest: { path: string; name: string; length: number }[];
	commentCount: number;
};

function likePattern(value: string) {
	return `%${value.replace(/[\\%_]/g, '\\$&')}%`;
}

export function getCategories(database: Database) {
	return database
		.prepare('SELECT id, slug, name, position FROM categories ORDER BY position, name')
		.all() as { id: number; slug: string; name: string; position: number }[];
}

export function getPopularTags(database: Database, limit = 20) {
	return database
		.prepare(
			`SELECT tg.name, COUNT(*) AS count FROM tags tg
			JOIN torrent_tags tt ON tt.tag_id = tg.id JOIN torrents t ON t.id = tt.torrent_id
			WHERE t.status = 'visible' GROUP BY tg.id ORDER BY count DESC, tg.name LIMIT ?`
		)
		.all(limit) as { name: string; count: number }[];
}

export function listTorrents(
	database: Database,
	options: {
		search?: string;
		category?: string;
		tag?: string;
		sort?: string;
		page?: number;
		uploaderId?: number;
		limit?: number;
	} = {}
) {
	const where = ["t.status = 'visible'"];
	const parameters: Array<string | number> = [];
	if (options.search) {
		where.push("(t.name LIKE ? ESCAPE '\\' OR t.description LIKE ? ESCAPE '\\')");
		parameters.push(likePattern(options.search), likePattern(options.search));
	}
	if (options.category) {
		where.push('c.slug = ?');
		parameters.push(options.category);
	}
	if (options.tag) {
		where.push(
			'EXISTS (SELECT 1 FROM torrent_tags filter_tt JOIN tags filter_t ON filter_t.id = filter_tt.tag_id WHERE filter_tt.torrent_id = t.id AND filter_t.name = ?)'
		);
		parameters.push(options.tag);
	}
	if (options.uploaderId) {
		where.push('t.uploader_id = ?');
		parameters.push(options.uploaderId);
	}
	const sortColumns: Record<string, string> = {
		newest: 't.created_at DESC',
		oldest: 't.created_at ASC',
		name: 't.name COLLATE NOCASE ASC',
		size_desc: 't.size_bytes DESC',
		size_asc: 't.size_bytes ASC',
		seeders: 'seeders DESC, t.created_at DESC'
	};
	const order = sortColumns[options.sort ?? 'newest'] ?? sortColumns.newest;
	const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
	const page = Math.max(options.page ?? 1, 1);
	const offset = (page - 1) * limit;
	const rows = database
		.prepare(
			`SELECT t.id, t.info_hash AS infoHash, t.name, t.size_bytes AS sizeBytes,
				t.source_type AS sourceType, t.seeders, t.leechers, t.created_at AS createdAt,
				c.name AS category, c.slug AS categorySlug, u.username AS uploader,
				COALESCE(GROUP_CONCAT(tg.name, '|'), '') AS tagList
			FROM torrents t
			JOIN categories c ON c.id = t.category_id
			JOIN users u ON u.id = t.uploader_id
			LEFT JOIN torrent_tags tt ON tt.torrent_id = t.id
			LEFT JOIN tags tg ON tg.id = tt.tag_id
			WHERE ${where.join(' AND ')}
			GROUP BY t.id ORDER BY ${order} LIMIT ? OFFSET ?`
		)
		.all(...parameters, limit, offset) as (Omit<TorrentListItem, 'tags'> & { tagList: string })[];
	const count = database
		.prepare(
			`SELECT COUNT(*) AS count FROM torrents t
			JOIN categories c ON c.id = t.category_id
			WHERE ${where.join(' AND ')}`
		)
		.get(...parameters) as { count: number };
	return {
		items: rows.map(({ tagList, ...row }) => ({
			...row,
			tags: tagList ? tagList.split('|') : []
		})),
		total: count.count,
		page,
		pages: Math.max(Math.ceil(count.count / limit), 1)
	};
}

export function getTorrent(database: Database, id: number, includeHidden = false) {
	const row = database
		.prepare(
			`SELECT t.id, t.info_hash AS infoHash, t.name, t.description, t.size_bytes AS sizeBytes,
				t.source_type AS sourceType, t.magnet_uri AS magnetUri, t.torrent_blob AS torrentBlob,
				t.file_manifest_json AS fileManifestJson, t.status, t.seeders, t.leechers,
				t.created_at AS createdAt, c.name AS category, c.slug AS categorySlug,
				u.username AS uploader, COALESCE(GROUP_CONCAT(tg.name, '|'), '') AS tagList,
				COUNT(DISTINCT c2.id) AS commentCount
			FROM torrents t
			JOIN categories c ON c.id = t.category_id
			JOIN users u ON u.id = t.uploader_id
			LEFT JOIN torrent_tags tt ON tt.torrent_id = t.id
			LEFT JOIN tags tg ON tg.id = tt.tag_id
			LEFT JOIN comments c2 ON c2.torrent_id = t.id AND c2.status = 'visible'
			WHERE t.id = ? ${includeHidden ? '' : "AND t.status = 'visible'"}
			GROUP BY t.id`
		)
		.get(id) as
		| (Omit<TorrentDetail, 'fileManifest' | 'tags'> & {
				fileManifestJson: string;
				tagList: string;
				torrentBlob: Uint8Array | null;
		  })
		| null;
	if (!row) return null;
	const { fileManifestJson, tagList, torrentBlob, ...torrent } = row;
	return {
		...torrent,
		torrentBlob,
		fileManifest: JSON.parse(fileManifestJson) as TorrentDetail['fileManifest'],
		tags: tagList ? tagList.split('|') : []
	};
}

export function getTorrentBlob(database: Database, id: number, includeHidden = false) {
	const row = database
		.prepare(
			`SELECT torrent_blob AS torrentBlob, name, status FROM torrents WHERE id = ? ${includeHidden ? '' : "AND status = 'visible'"}`
		)
		.get(id) as { torrentBlob: Uint8Array | null; name: string; status: string } | null;
	return row;
}

export function getComments(database: Database, torrentId: number, includeHidden = false) {
	return database
		.prepare(
			`SELECT cm.id, cm.body, cm.status, cm.created_at AS createdAt,
				u.id AS authorId, u.username AS author, u.role AS authorRole
			FROM comments cm JOIN users u ON u.id = cm.author_id
			WHERE cm.torrent_id = ? ${includeHidden ? '' : "AND cm.status = 'visible'"}
			ORDER BY cm.created_at ASC`
		)
		.all(torrentId) as {
		id: number;
		body: string;
		status: string;
		createdAt: string;
		authorId: number;
		author: string;
		authorRole: string;
	}[];
}

export async function createTorrent(
	database: Database,
	input: {
		uploaderId: number;
		title: string;
		description: string;
		categoryId: number;
		tags: string[];
		sourceType: 'magnet' | 'torrent';
		magnet?: string;
		torrentBytes?: Uint8Array;
		maxFileBytes: number;
		maxMagnetLength: number;
		limits: { hour: number; day: number; total: number };
	}
) {
	if (input.sourceType === 'torrent' && !input.torrentBytes?.length)
		throw new Error('Choose a .torrent file.');
	if (
		input.sourceType === 'torrent' &&
		input.torrentBytes &&
		input.torrentBytes.byteLength > input.maxFileBytes
	) {
		throw new Error('The .torrent file exceeds the configured upload limit.');
	}
	if (
		input.sourceType === 'magnet' &&
		(!input.magnet || input.magnet.length > input.maxMagnetLength)
	) {
		throw new Error('Enter a valid magnet link within the configured length limit.');
	}
	const parsed = await parseTorrent(
		input.sourceType === 'torrent' ? input.torrentBytes! : input.magnet!
	);
	if (!/^[a-f0-9]{40}$/i.test(parsed.infoHash))
		throw new Error('Only BitTorrent v1 info hashes are supported.');
	if ((parsed.files?.length ?? 0) > 10_000 || (parsed.pieces?.length ?? 0) > 200_000) {
		throw new Error('Torrent metadata contains too many files or pieces.');
	}
	const fileManifest = (parsed.files ?? []).map((file) => ({
		path: file.path.slice(0, 1_024),
		name: file.name.slice(0, 512),
		length: Math.max(0, file.length)
	}));
	const sizeBytes = Math.max(
		0,
		parsed.length ?? fileManifest.reduce((total, file) => total + file.length, 0)
	);
	const magnetUri = toMagnetURI(parsed);
	const create = database.transaction(() => {
		const quotaError = checkUploadLimits(database, input.uploaderId, input.limits);
		if (quotaError) throw new Error(quotaError);
		const result = database
			.prepare(
				`INSERT INTO torrents
				(info_hash, name, description, size_bytes, source_type, magnet_uri, torrent_blob, file_manifest_json, uploader_id, category_id)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.run(
				parsed.infoHash.toLowerCase(),
				input.title,
				input.description,
				sizeBytes,
				input.sourceType,
				magnetUri,
				input.sourceType === 'torrent' ? input.torrentBytes! : null,
				JSON.stringify(fileManifest),
				input.uploaderId,
				input.categoryId
			);
		const torrentId = Number(result.lastInsertRowid);
		const insertTag = database.prepare('INSERT OR IGNORE INTO tags (slug, name) VALUES (?, ?)');
		const findTag = database.prepare('SELECT id FROM tags WHERE slug = ?');
		const attachTag = database.prepare(
			'INSERT OR IGNORE INTO torrent_tags (torrent_id, tag_id) VALUES (?, ?)'
		);
		for (const tag of input.tags) {
			insertTag.run(tag, tag);
			const tagRow = findTag.get(tag) as { id: number };
			attachTag.run(torrentId, tagRow.id);
		}
		audit(database, input.uploaderId, 'torrent.created', 'torrent', torrentId, {
			infoHash: parsed.infoHash,
			sourceType: input.sourceType
		});
		return torrentId;
	});
	return create();
}

export function checkUploadLimits(
	database: Database,
	userId: number,
	limits: { hour: number; day: number; total: number }
) {
	const hour = database
		.prepare(
			"SELECT COUNT(*) AS count FROM torrents WHERE uploader_id = ? AND datetime(created_at) >= datetime('now', '-1 hour')"
		)
		.get(userId) as { count: number };
	const day = database
		.prepare(
			"SELECT COUNT(*) AS count FROM torrents WHERE uploader_id = ? AND datetime(created_at) >= datetime('now', '-1 day')"
		)
		.get(userId) as { count: number };
	const total = database
		.prepare('SELECT COUNT(*) AS count FROM torrents WHERE uploader_id = ?')
		.get(userId) as { count: number };
	if (hour.count >= limits.hour) return 'Hourly upload limit reached.';
	if (day.count >= limits.day) return 'Daily upload limit reached.';
	if (total.count >= limits.total) return 'Account upload quota reached.';
	return null;
}

export function addComment(database: Database, torrentId: number, authorId: number, body: string) {
	const result = database
		.prepare(
			"INSERT INTO comments (torrent_id, author_id, body) SELECT id, ?, ? FROM torrents WHERE id = ? AND status = 'visible'"
		)
		.run(authorId, body, torrentId);
	if (result.changes !== 1) throw new Error('Torrent not found.');
}

export function createReport(
	database: Database,
	input: {
		reporterId: number;
		torrentId: number;
		commentId?: number;
		reason: string;
		details: string;
	}
) {
	const result = database
		.prepare(
			`INSERT INTO reports (reporter_id, torrent_id, comment_id, reason, details)
			SELECT ?, t.id, ?, ?, ? FROM torrents t WHERE t.id = ? AND t.status = 'visible'`
		)
		.run(input.reporterId, input.commentId ?? null, input.reason, input.details, input.torrentId);
	if (result.changes !== 1) throw new Error('Torrent not found.');
}

export function getUserProfile(database: Database, username: string) {
	const user = database
		.prepare(
			`SELECT id, username, role, status, created_at AS createdAt, last_login_at AS lastLoginAt
			FROM users WHERE username = ? COLLATE NOCASE AND status != 'banned'`
		)
		.get(username) as {
		id: number;
		username: string;
		role: string;
		status: string;
		createdAt: string;
		lastLoginAt: string | null;
	} | null;
	if (!user) return null;
	const counts = database
		.prepare(
			`SELECT
			(SELECT COUNT(*) FROM torrents WHERE uploader_id = ? AND status = 'visible') AS torrents,
			(SELECT COUNT(*) FROM comments WHERE author_id = ? AND status = 'visible') AS comments`
		)
		.get(user.id, user.id) as { torrents: number; comments: number };
	return { ...user, ...counts };
}

export function updateTorrentTimestamp(database: Database, torrentId: number) {
	database.prepare('UPDATE torrents SET updated_at = ? WHERE id = ?').run(nowIso(), torrentId);
}
