import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { SCHEMA } from './schema';

const categories = [
	['other', 'Other', 0],
	['audio', 'Audio', 10],
	['books', 'Books', 20],
	['games', 'Games', 30],
	['movies', 'Movies', 40],
	['music', 'Music', 50],
	['software', 'Software', 60],
	['tv', 'TV', 70]
] as const;

export function createDatabase(path = process.env.DATABASE_PATH ?? 'data/thepirateharbor.sqlite') {
	if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
	const database = new Database(path, { create: true });
	database.run('PRAGMA foreign_keys = ON');
	if (path !== ':memory:') database.run('PRAGMA journal_mode = WAL');
	database.exec(SCHEMA);
	const insert = database.prepare(
		'INSERT OR IGNORE INTO categories (slug, name, position) VALUES (?, ?, ?)'
	);
	for (const category of categories) insert.run(...category);
	return database;
}

const globalDatabase = globalThis as typeof globalThis & {
	__thePirateHarborDatabase?: Database;
};

export function getDatabase() {
	globalDatabase.__thePirateHarborDatabase ??= createDatabase();
	return globalDatabase.__thePirateHarborDatabase;
}
