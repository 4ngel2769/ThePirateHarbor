export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL COLLATE NOCASE UNIQUE,
	email TEXT NOT NULL COLLATE NOCASE UNIQUE,
	password_hash TEXT NOT NULL,
	role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
	status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS auth_sessions (
	token_hash TEXT PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	expires_at TEXT NOT NULL,
	last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS invites (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	token_hash TEXT NOT NULL UNIQUE,
	created_by INTEGER NOT NULL REFERENCES users(id),
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	expires_at TEXT NOT NULL,
	used_at TEXT,
	used_by INTEGER REFERENCES users(id),
	revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS categories (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	slug TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tags (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	slug TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS torrents (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	info_hash TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	size_bytes INTEGER NOT NULL DEFAULT 0,
	source_type TEXT NOT NULL CHECK (source_type IN ('magnet', 'torrent')),
	magnet_uri TEXT,
	torrent_blob BLOB,
	file_manifest_json TEXT NOT NULL DEFAULT '[]',
	uploader_id INTEGER NOT NULL REFERENCES users(id),
	category_id INTEGER NOT NULL REFERENCES categories(id),
	status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'removed')),
	seeders INTEGER NOT NULL DEFAULT 0,
	leechers INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS torrent_tags (
	torrent_id INTEGER NOT NULL REFERENCES torrents(id) ON DELETE CASCADE,
	tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
	PRIMARY KEY (torrent_id, tag_id)
);

CREATE TABLE IF NOT EXISTS comments (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	torrent_id INTEGER NOT NULL REFERENCES torrents(id) ON DELETE CASCADE,
	author_id INTEGER NOT NULL REFERENCES users(id),
	body TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'deleted')),
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS reports (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	reporter_id INTEGER NOT NULL REFERENCES users(id),
	torrent_id INTEGER REFERENCES torrents(id) ON DELETE CASCADE,
	comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
	reason TEXT NOT NULL,
	details TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	resolved_at TEXT,
	resolved_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS legal_takedowns (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	requester_name TEXT NOT NULL,
	requester_email TEXT NOT NULL,
	torrent_id INTEGER REFERENCES torrents(id),
	info_hash TEXT,
	original_url TEXT,
	statement TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'rejected')),
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	resolved_at TEXT,
	resolved_by INTEGER REFERENCES users(id),
	resolution_note TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	actor_id INTEGER REFERENCES users(id),
	action TEXT NOT NULL,
	entity_type TEXT NOT NULL,
	entity_id TEXT,
	details_json TEXT NOT NULL DEFAULT '{}',
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS config_overrides (
	key TEXT PRIMARY KEY,
	value_json TEXT NOT NULL,
	updated_by INTEGER REFERENCES users(id),
	updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS rate_limits (
	bucket TEXT NOT NULL,
	key_hash TEXT NOT NULL,
	window_started INTEGER NOT NULL,
	hits INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (bucket, key_hash, window_started)
);

CREATE INDEX IF NOT EXISTS torrents_status_created_idx ON torrents(status, created_at DESC);
CREATE INDEX IF NOT EXISTS torrents_category_status_idx ON torrents(category_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_torrent_status_idx ON comments(torrent_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_status_created_idx ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS takedowns_status_created_idx ON legal_takedowns(status, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS invites_expiry_idx ON invites(expires_at);
`;
