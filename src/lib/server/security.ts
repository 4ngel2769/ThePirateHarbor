import { createHash, randomBytes } from 'node:crypto';
import type { Database } from 'bun:sqlite';

export function nowIso() {
	return new Date().toISOString();
}

export function randomToken() {
	return randomBytes(32).toString('base64url');
}

export function hashToken(token: string) {
	return createHash('sha256').update(token).digest('hex');
}

export function audit(
	database: Database,
	actorId: number | null,
	action: string,
	entityType: string,
	entityId: number | string | null,
	details: Record<string, unknown> = {}
) {
	database
		.prepare(
			'INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details_json) VALUES (?, ?, ?, ?, ?)'
		)
		.run(
			actorId,
			action,
			entityType,
			entityId === null ? null : String(entityId),
			JSON.stringify(details)
		);
}

export function consumeRateLimit(
	database: Database,
	bucket: string,
	key: string,
	limit: number,
	windowMs: number
) {
	const now = Date.now();
	const started = Math.floor(now / windowMs) * windowMs;
	const keyHash = hashToken(`${bucket}:${key}`);
	const consume = database.transaction(() => {
		database
			.prepare(
				'INSERT INTO rate_limits (bucket, key_hash, window_started, hits) VALUES (?, ?, ?, 1) ON CONFLICT(bucket, key_hash, window_started) DO UPDATE SET hits = hits + 1'
			)
			.run(bucket, keyHash, started);
		const row = database
			.prepare(
				'SELECT hits FROM rate_limits WHERE bucket = ? AND key_hash = ? AND window_started = ?'
			)
			.get(bucket, keyHash, started) as { hits: number };
		return row.hits <= limit;
	});
	const allowed = consume();
	if (now % 100 < 5) {
		database
			.prepare('DELETE FROM rate_limits WHERE window_started < ?')
			.run(started - windowMs * 2);
	}
	return allowed;
}
