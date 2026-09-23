import { error, redirect, type Cookies } from '@sveltejs/kit';
import type { Database } from 'bun:sqlite';
import type { Role, SessionUser } from '$lib/types';
import { hashToken, nowIso, randomToken } from './security';

export const SESSION_COOKIE = 'tph_session';
const passwordOptions = { algorithm: 'argon2id', memoryCost: 65_536, timeCost: 2 } as const;

type UserRow = {
	id: number;
	username: string;
	password_hash: string;
	role: Role;
	status: SessionUser['status'];
	created_at: string;
	last_login_at: string | null;
};

function sessionUser(row: UserRow): SessionUser {
	return {
		id: row.id,
		username: row.username,
		role: row.role,
		status: row.status,
		createdAt: row.created_at,
		lastLoginAt: row.last_login_at
	};
}

export async function createFirstAdmin(
	database: Database,
	input: { username: string; email: string; password: string }
) {
	const passwordHash = await Bun.password.hash(input.password, passwordOptions);
	const create = database.transaction(() => {
		const count = database.prepare('SELECT COUNT(*) AS count FROM users').get() as {
			count: number;
		};
		if (count.count > 0) throw new Error('Setup is already complete');
		const result = database
			.prepare(
				"INSERT INTO users (username, email, password_hash, role, last_login_at) VALUES (?, ?, ?, 'admin', ?)"
			)
			.run(input.username, input.email, passwordHash, nowIso());
		return Number(result.lastInsertRowid);
	});
	return create();
}

export async function authenticate(database: Database, username: string, password: string) {
	const row = database
		.prepare(
			'SELECT id, username, password_hash, role, status, created_at, last_login_at FROM users WHERE username = ? COLLATE NOCASE'
		)
		.get(username) as UserRow | null;
	if (!row) {
		await Bun.password.hash(password, passwordOptions);
		return null;
	}
	if (row.status !== 'active' || !(await Bun.password.verify(password, row.password_hash))) {
		return null;
	}
	database.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(nowIso(), row.id);
	return sessionUser({ ...row, last_login_at: nowIso() });
}

export function createSession(database: Database, userId: number, expiryDays: number) {
	const token = randomToken();
	const expiresAt = new Date(Date.now() + expiryDays * 86_400_000).toISOString();
	database
		.prepare('INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
		.run(hashToken(token), userId, expiresAt);
	return { token, expiresAt };
}

export function getSessionUser(database: Database, token: string) {
	const row = database
		.prepare(
			`SELECT u.id, u.username, u.password_hash, u.role, u.status, u.created_at, u.last_login_at
			FROM auth_sessions s JOIN users u ON u.id = s.user_id
			WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?`
		)
		.get(hashToken(token), nowIso()) as UserRow | null;
	if (!row || row.status !== 'active') return null;
	database
		.prepare('UPDATE auth_sessions SET last_seen_at = ? WHERE token_hash = ?')
		.run(nowIso(), hashToken(token));
	return sessionUser(row);
}

export function revokeSession(database: Database, token: string) {
	database
		.prepare('UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ?')
		.run(nowIso(), hashToken(token));
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: string) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires: new Date(expiresAt)
	});
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function createInvite(database: Database, createdBy: number, expiryDays: number) {
	const token = randomToken();
	const expiresAt = new Date(Date.now() + expiryDays * 86_400_000).toISOString();
	database
		.prepare('INSERT INTO invites (token_hash, created_by, expires_at) VALUES (?, ?, ?)')
		.run(hashToken(token), createdBy, expiresAt);
	return { token, expiresAt };
}

export function getValidInvite(database: Database, token: string) {
	return database
		.prepare(
			'SELECT id, expires_at FROM invites WHERE token_hash = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?'
		)
		.get(hashToken(token), nowIso()) as { id: number; expires_at: string } | null;
}

export async function createAccountFromInvite(
	database: Database,
	token: string,
	input: { username: string; email: string; password: string }
) {
	if (!getValidInvite(database, token)) throw new Error('This invite is invalid or expired');
	const passwordHash = await Bun.password.hash(input.password, passwordOptions);
	const create = database.transaction(() => {
		const invite = getValidInvite(database, token);
		if (!invite) throw new Error('This invite is invalid or expired');
		const result = database
			.prepare("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'user')")
			.run(input.username, input.email, passwordHash);
		const userId = Number(result.lastInsertRowid);
		const consumed = database
			.prepare('UPDATE invites SET used_at = ?, used_by = ? WHERE id = ? AND used_at IS NULL')
			.run(nowIso(), userId, invite.id);
		if (consumed.changes !== 1) throw new Error('This invite is invalid or expired');
		return userId;
	});
	return create();
}

export function requireUser(locals: App.Locals, allowed: Role[] = ['user', 'moderator', 'admin']) {
	if (!locals.user) redirect(303, '/login');
	if (!allowed.includes(locals.user.role)) error(403, 'You do not have permission to do that');
	return locals.user;
}

export function canModerate(user: SessionUser | null) {
	return user?.role === 'moderator' || user?.role === 'admin';
}
