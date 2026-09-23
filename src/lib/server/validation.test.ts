import { describe, expect, test } from 'bun:test';
import { mergeConfig } from './config';
import adminDefaults from '../../../config/admin.json';
import { formatBytes } from '../format';
import { slug, tags, username } from '../validation';

describe('configuration limits', () => {
	test('accepts valid overrides and rejects values beyond hard ceilings', () => {
		const defaults = adminDefaults as ReturnType<typeof mergeConfig>;
		expect(mergeConfig(defaults, { maxUploadsPerHour: 12 }).maxUploadsPerHour).toBe(12);
		expect(mergeConfig(defaults, { maxUploadsPerHour: 10_000 }).maxUploadsPerHour).toBe(
			defaults.maxUploadsPerHour
		);
		expect(mergeConfig(defaults, { unknown: 'ignored' })).not.toHaveProperty('unknown');
	});
});

describe('input helpers', () => {
	test('normalizes usernames, tags, and byte display', () => {
		expect(username(' Valid_User ')).toBe('valid_user');
		expect(username('no spaces')).toBeNull();
		expect(tags(' Linux, ISO, linux, science fiction ', 3)).toEqual([
			'linux',
			'iso',
			'science-fiction'
		]);
		expect(slug('  Open Source: Archive! ')).toBe('open-source-archive');
		expect(formatBytes(1_048_576)).toBe('1.0 MiB');
	});
});
