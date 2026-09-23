import adminDefaults from '../../../config/admin.json';
import type { AppConfig } from '$lib/types';
import { getDatabase } from './db';

type ConfigKey = keyof AppConfig;

const numericLimits: Record<string, number> = {
	itemsPerPage: 100,
	maxTorrentFileBytes: 10 * 1024 * 1024,
	maxMagnetLength: 16 * 1024,
	maxTitleLength: 500,
	maxDescriptionLength: 20_000,
	maxCommentLength: 5_000,
	maxReportLength: 5_000,
	maxTags: 30,
	maxUploadsPerHour: 100,
	maxUploadsPerDay: 1_000,
	maxUploadsPerUser: 100_000,
	inviteExpiryDays: 90,
	sessionExpiryDays: 365
};

export function mergeConfig(defaults: AppConfig, overrides: Record<string, unknown>): AppConfig {
	const config = { ...defaults };
	for (const key of Object.keys(overrides) as ConfigKey[]) {
		const value = overrides[key];
		if (key in numericLimits) {
			if (
				typeof value === 'number' &&
				Number.isInteger(value) &&
				value > 0 &&
				value <= numericLimits[key]
			) {
				Object.assign(config, { [key]: value });
			}
			continue;
		}
		if (key in defaults) Object.assign(config, { [key]: value });
	}
	return config;
}

export function getConfig(database = getDatabase()): AppConfig {
	const rows = database.query('SELECT key, value_json FROM config_overrides').all() as {
		key: string;
		value_json: string;
	}[];
	const overrides: Record<string, unknown> = {};
	for (const row of rows) {
		try {
			overrides[row.key] = JSON.parse(row.value_json);
		} catch {
			continue;
		}
	}
	return mergeConfig(adminDefaults as AppConfig, overrides);
}

export function saveConfig(
	values: Record<string, unknown>,
	updatedBy: number,
	database = getDatabase()
) {
	mergeConfig(adminDefaults as AppConfig, values);
	const keys = Object.keys(adminDefaults) as ConfigKey[];
	const upsert = database.prepare(
		"INSERT INTO config_overrides (key, value_json, updated_by) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_by = excluded.updated_by, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"
	);
	const clear = database.prepare('DELETE FROM config_overrides WHERE key = ?');
	const apply = database.transaction(() => {
		for (const key of keys) {
			const value = (values as Record<string, unknown>)[key];
			if (value === undefined || value === adminDefaults[key]) clear.run(key);
			else upsert.run(key, JSON.stringify(value), updatedBy);
		}
	});
	apply();
	return getConfig(database);
}
