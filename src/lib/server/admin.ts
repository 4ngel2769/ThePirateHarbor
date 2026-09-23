import type { Database } from 'bun:sqlite';
import type { Role, TorrentStatus, UserStatus } from '$lib/types';
import { slug } from '$lib/validation';
import { audit, nowIso } from './security';

export function getAdminStats(database: Database) {
	return database
		.prepare(
			`SELECT
			(SELECT COUNT(*) FROM users) AS users,
			(SELECT COUNT(*) FROM torrents WHERE status = 'visible') AS torrents,
			(SELECT COUNT(*) FROM torrents WHERE status != 'visible') AS hiddenTorrents,
			(SELECT COUNT(*) FROM reports WHERE status IN ('open', 'reviewing')) AS openReports,
			(SELECT COUNT(*) FROM legal_takedowns WHERE status IN ('open', 'reviewing')) AS openTakedowns,
			(SELECT COUNT(*) FROM invites WHERE used_at IS NULL AND revoked_at IS NULL AND expires_at > ?) AS activeInvites`
		)
		.get(nowIso()) as {
		users: number;
		torrents: number;
		hiddenTorrents: number;
		openReports: number;
		openTakedowns: number;
		activeInvites: number;
	};
}

export function getUsers(database: Database) {
	return database
		.prepare(
			`SELECT id, username, email, role, status, created_at AS createdAt, last_login_at AS lastLoginAt,
			(SELECT COUNT(*) FROM torrents WHERE uploader_id = users.id) AS uploads
			FROM users ORDER BY created_at DESC`
		)
		.all() as {
		id: number;
		username: string;
		email: string;
		role: Role;
		status: UserStatus;
		createdAt: string;
		lastLoginAt: string | null;
		uploads: number;
	}[];
}

export function getInvites(database: Database) {
	return database
		.prepare(
			`SELECT i.id, i.created_at AS createdAt, i.expires_at AS expiresAt, i.used_at AS usedAt,
			i.revoked_at AS revokedAt, creator.username AS creator, consumer.username AS consumer
			FROM invites i JOIN users creator ON creator.id = i.created_by
			LEFT JOIN users consumer ON consumer.id = i.used_by ORDER BY i.created_at DESC LIMIT 100`
		)
		.all() as {
		id: number;
		createdAt: string;
		expiresAt: string;
		usedAt: string | null;
		revokedAt: string | null;
		creator: string;
		consumer: string | null;
	}[];
}

export function getReports(database: Database, status = '') {
	const where = status ? 'WHERE r.status = ?' : '';
	return database
		.prepare(
			`SELECT r.id, r.reason, r.details, r.status, r.created_at AS createdAt,
			reporter.username AS reporter, t.id AS torrentId, t.name AS torrentName,
			c.id AS commentId, c.body AS commentBody
			FROM reports r JOIN users reporter ON reporter.id = r.reporter_id
			LEFT JOIN torrents t ON t.id = r.torrent_id
			LEFT JOIN comments c ON c.id = r.comment_id
			${where} ORDER BY CASE r.status WHEN 'open' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, r.created_at DESC LIMIT 200`
		)
		.all(...(status ? [status] : [])) as {
		id: number;
		reason: string;
		details: string;
		status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
		createdAt: string;
		reporter: string;
		torrentId: number | null;
		torrentName: string | null;
		commentId: number | null;
		commentBody: string | null;
	}[];
}

export function getModerationContent(database: Database) {
	return {
		torrents: database
			.prepare(
				`SELECT id, name, status, updated_at AS updatedAt FROM torrents WHERE status != 'visible' ORDER BY updated_at DESC LIMIT 100`
			)
			.all() as { id: number; name: string; status: TorrentStatus; updatedAt: string }[],
		comments: database
			.prepare(
				`SELECT c.id, c.body, c.status, c.updated_at AS updatedAt, t.id AS torrentId, t.name AS torrentName, u.username AS author
				FROM comments c JOIN torrents t ON t.id = c.torrent_id JOIN users u ON u.id = c.author_id
				WHERE c.status != 'visible' ORDER BY c.updated_at DESC LIMIT 100`
			)
			.all() as {
			id: number;
			body: string;
			status: string;
			updatedAt: string;
			torrentId: number;
			torrentName: string;
			author: string;
		}[]
	};
}

export function getAuditLogs(database: Database, limit = 100) {
	return database
		.prepare(
			`SELECT a.id, a.action, a.entity_type AS entityType, a.entity_id AS entityId,
			a.details_json AS detailsJson, a.created_at AS createdAt, u.username AS actor
			FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.created_at DESC LIMIT ?`
		)
		.all(limit) as {
		id: number;
		action: string;
		entityType: string;
		entityId: string | null;
		detailsJson: string;
		createdAt: string;
		actor: string | null;
	}[];
}

export function getTakedowns(database: Database) {
	return database
		.prepare(
			`SELECT d.id, d.requester_name AS requesterName, d.requester_email AS requesterEmail,
			d.torrent_id AS torrentId, d.info_hash AS infoHash, d.original_url AS originalUrl,
			d.statement, d.status, d.created_at AS createdAt, d.resolution_note AS resolutionNote,
			t.name AS torrentName FROM legal_takedowns d LEFT JOIN torrents t ON t.id = d.torrent_id
			ORDER BY CASE d.status WHEN 'open' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, d.created_at DESC`
		)
		.all() as {
		id: number;
		requesterName: string;
		requesterEmail: string;
		torrentId: number | null;
		infoHash: string | null;
		originalUrl: string | null;
		statement: string;
		status: 'open' | 'reviewing' | 'resolved' | 'rejected';
		createdAt: string;
		resolutionNote: string | null;
		torrentName: string | null;
	}[];
}

export function updateUserAccess(
	database: Database,
	actorId: number,
	userId: number,
	role: Role,
	status: UserStatus
) {
	const update = database.transaction(() => {
		const target = database
			.prepare('SELECT id, role, status FROM users WHERE id = ?')
			.get(userId) as { id: number; role: Role; status: UserStatus } | null;
		if (!target) throw new Error('User not found');
		if (target.id === actorId && (role !== 'admin' || status !== 'active')) {
			throw new Error('You cannot remove your own administrator access.');
		}
		if (target.role === 'admin' && (role !== 'admin' || status !== 'active')) {
			const admins = database
				.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND status = 'active'")
				.get() as { count: number };
			if (admins.count <= 1) throw new Error('At least one active administrator is required.');
		}
		database
			.prepare('UPDATE users SET role = ?, status = ? WHERE id = ?')
			.run(role, status, userId);
		database
			.prepare('UPDATE auth_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
			.run(nowIso(), userId);
		audit(database, actorId, 'user.access_updated', 'user', userId, { role, status });
	});
	update();
}

export function setTorrentStatus(
	database: Database,
	actorId: number,
	actorRole: Role,
	torrentId: number,
	status: TorrentStatus
) {
	if (status === 'removed' && actorRole !== 'admin')
		throw new Error('Only administrators can remove torrents.');
	const current = database.prepare('SELECT status FROM torrents WHERE id = ?').get(torrentId) as {
		status: TorrentStatus;
	} | null;
	if (!current) throw new Error('Torrent not found');
	if (current.status === 'removed' && status === 'visible' && actorRole !== 'admin') {
		throw new Error('Only administrators can restore removed torrents.');
	}
	database
		.prepare('UPDATE torrents SET status = ?, updated_at = ? WHERE id = ?')
		.run(status, nowIso(), torrentId);
	audit(database, actorId, 'torrent.status_updated', 'torrent', torrentId, {
		from: current.status,
		to: status
	});
}

export function setCommentStatus(
	database: Database,
	actorId: number,
	commentId: number,
	status: 'visible' | 'hidden' | 'deleted'
) {
	const current = database.prepare('SELECT status FROM comments WHERE id = ?').get(commentId) as {
		status: string;
	} | null;
	if (!current) throw new Error('Comment not found');
	database
		.prepare('UPDATE comments SET status = ?, updated_at = ? WHERE id = ?')
		.run(status, nowIso(), commentId);
	audit(database, actorId, 'comment.status_updated', 'comment', commentId, {
		from: current.status,
		to: status
	});
}

export function setReportStatus(
	database: Database,
	actorId: number,
	reportId: number,
	status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
) {
	const result = database
		.prepare('UPDATE reports SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?')
		.run(
			status,
			['resolved', 'dismissed'].includes(status) ? nowIso() : null,
			['resolved', 'dismissed'].includes(status) ? actorId : null,
			reportId
		);
	if (result.changes !== 1) throw new Error('Report not found');
	audit(database, actorId, 'report.status_updated', 'report', reportId, { status });
}

export function setTakedownStatus(
	database: Database,
	actorId: number,
	takedownId: number,
	status: 'open' | 'reviewing' | 'resolved' | 'rejected',
	note: string
) {
	const update = database.transaction(() => {
		const row = database
			.prepare('SELECT torrent_id AS torrentId FROM legal_takedowns WHERE id = ?')
			.get(takedownId) as { torrentId: number | null } | null;
		if (!row) throw new Error('Takedown request not found');
		if (status === 'resolved' && row.torrentId) {
			setTorrentStatus(database, actorId, 'admin', row.torrentId, 'removed');
		}
		const result = database
			.prepare(
				'UPDATE legal_takedowns SET status = ?, resolved_at = ?, resolved_by = ?, resolution_note = ? WHERE id = ?'
			)
			.run(
				status,
				['resolved', 'rejected'].includes(status) ? nowIso() : null,
				['resolved', 'rejected'].includes(status) ? actorId : null,
				note,
				takedownId
			);
		if (result.changes !== 1) throw new Error('Takedown request not found');
		audit(database, actorId, 'takedown.status_updated', 'legal_takedown', takedownId, { status });
	});
	update();
}

export function createCategory(
	database: Database,
	actorId: number,
	name: string,
	position: number
) {
	const categorySlug = slug(name);
	if (!categorySlug) throw new Error('Enter a valid category name.');
	const result = database
		.prepare('INSERT INTO categories (slug, name, position) VALUES (?, ?, ?)')
		.run(categorySlug, name, position);
	audit(database, actorId, 'category.created', 'category', Number(result.lastInsertRowid), {
		slug: categorySlug
	});
}

export function revokeInvite(database: Database, actorId: number, inviteId: number) {
	const result = database
		.prepare(
			'UPDATE invites SET revoked_at = ? WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL'
		)
		.run(nowIso(), inviteId);
	if (result.changes !== 1) throw new Error('Invite is no longer active.');
	audit(database, actorId, 'invite.revoked', 'invite', inviteId);
}
