import { roles, type Role } from './types';

export function text(value: FormDataEntryValue | null, maxLength: number) {
	const normalized = String(value ?? '')
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
		.trim();
	return normalized.slice(0, maxLength);
}

export function username(value: FormDataEntryValue | null) {
	const normalized = String(value ?? '')
		.trim()
		.toLowerCase();
	return /^[a-z0-9][a-z0-9_-]{2,31}$/.test(normalized) ? normalized : null;
}

export function email(value: FormDataEntryValue | null) {
	const normalized = String(value ?? '')
		.trim()
		.toLowerCase();
	return normalized.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
		? normalized
		: null;
}

export function password(value: FormDataEntryValue | null) {
	const normalized = String(value ?? '');
	return normalized.length >= 12 && normalized.length <= 128 ? normalized : null;
}

export function slug(value: string) {
	return value
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 40);
}

export function tags(value: FormDataEntryValue | null, maxTags: number) {
	return [
		...new Set(
			String(value ?? '')
				.split(',')
				.map(slug)
				.filter(Boolean)
		)
	].slice(0, maxTags);
}

export function role(value: FormDataEntryValue | null): Role | null {
	return roles.includes(value as Role) ? (value as Role) : null;
}

export function integer(value: FormDataEntryValue | null, minimum: number, maximum: number) {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

export function boolean(value: FormDataEntryValue | null) {
	return value === 'on' || value === 'true';
}
