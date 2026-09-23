import { afterEach, describe, expect, test } from 'bun:test';
import type { Database } from 'bun:sqlite';
import {
	authenticate,
	createAccountFromInvite,
	createFirstAdmin,
	createInvite,
	createSession,
	getSessionUser,
	getValidInvite
} from './auth';
import { createDatabase } from './db';
import { addComment, checkUploadLimits, createTorrent, getTorrent, listTorrents } from './torrents';

const databases: Database[] = [];

afterEach(() => {
	for (const database of databases.splice(0)) database.close();
});

function database() {
	const created = createDatabase(':memory:');
	databases.push(created);
	return created;
}

describe('invite-only authentication', () => {
	test('creates one admin, consumes an invite once, and restores a session', async () => {
		const db = database();
		const adminId = await createFirstAdmin(db, {
			username: 'admin',
			email: 'admin@example.com',
			password: 'correct horse battery staple'
		});
		expect(adminId).toBe(1);
		const invite = createInvite(db, adminId, 7);
		expect(getValidInvite(db, invite.token)?.id).toBe(1);
		const stored = db.prepare('SELECT token_hash AS tokenHash FROM invites').get() as {
			tokenHash: string;
		};
		expect(stored.tokenHash).not.toBe(invite.token);

		const userId = await createAccountFromInvite(db, invite.token, {
			username: 'member',
			email: 'member@example.com',
			password: 'another secure password'
		});
		const session = createSession(db, userId, 30);
		expect(getSessionUser(db, session.token)?.username).toBe('member');
		await expect(
			createAccountFromInvite(db, invite.token, {
				username: 'reused',
				email: 'reused@example.com',
				password: 'a third secure password'
			})
		).rejects.toThrow('invalid or expired');
	});

	test('rejects an expired invite and invalid passwords', async () => {
		const db = database();
		const adminId = await createFirstAdmin(db, {
			username: 'admin',
			email: 'admin@example.com',
			password: 'correct horse battery staple'
		});
		const invite = createInvite(db, adminId, 0);
		expect(getValidInvite(db, invite.token)).toBeNull();
		expect(await authenticate(db, 'admin', 'wrong password value')).toBeNull();
		expect(await authenticate(db, 'admin', 'correct horse battery staple')).toMatchObject({
			username: 'admin',
			role: 'admin'
		});
	});
});

describe('torrent catalog', () => {
	test('stores a magnet, indexes it, comments, and enforces quota', async () => {
		const db = database();
		const adminId = await createFirstAdmin(db, {
			username: 'admin',
			email: 'admin@example.com',
			password: 'correct horse battery staple'
		});
		const invite = createInvite(db, adminId, 7);
		const userId = await createAccountFromInvite(db, invite.token, {
			username: 'member',
			email: 'member@example.com',
			password: 'another secure password'
		});
		const infoHash = 'a'.repeat(40);
		const id = await createTorrent(db, {
			uploaderId: userId,
			title: 'Open Source Archive',
			description: 'A test torrent',
			categoryId: 1,
			tags: ['linux', 'iso'],
			sourceType: 'magnet',
			magnet: `magnet:?xt=urn:btih:${infoHash}&dn=Open+Source+Archive`,
			maxFileBytes: 2_097_152,
			maxMagnetLength: 4_096,
			limits: { hour: 5, day: 20, total: 1 }
		});
		expect(getTorrent(db, id)?.name).toBe('Open Source Archive');
		expect(listTorrents(db, { search: 'Open Source' }).total).toBe(1);
		addComment(db, id, userId, 'Verified metadata');
		expect(getTorrent(db, id)?.commentCount).toBe(1);
		expect(checkUploadLimits(db, userId, { hour: 5, day: 20, total: 1 })).toBe(
			'Account upload quota reached.'
		);
		await expect(
			createTorrent(db, {
				uploaderId: userId,
				title: 'Duplicate',
				description: '',
				categoryId: 1,
				tags: [],
				sourceType: 'magnet',
				magnet: `magnet:?xt=urn:btih:${infoHash}`,
				maxFileBytes: 2_097_152,
				maxMagnetLength: 4_096,
				limits: { hour: 5, day: 20, total: 1 }
			})
		).rejects.toThrow();
	});
});
