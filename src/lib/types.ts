export const roles = ['user', 'moderator', 'admin'] as const;

export type Role = (typeof roles)[number];
export type UserStatus = 'active' | 'suspended' | 'banned';
export type TorrentStatus = 'visible' | 'hidden' | 'removed';
export type SourceType = 'magnet' | 'torrent';

export interface AppConfig {
	siteName: string;
	registrationEnabled: boolean;
	inviteOnly: boolean;
	webTorrentEnabled: boolean;
	itemsPerPage: number;
	maxTorrentFileBytes: number;
	maxMagnetLength: number;
	maxTitleLength: number;
	maxDescriptionLength: number;
	maxCommentLength: number;
	maxReportLength: number;
	maxTags: number;
	maxUploadsPerHour: number;
	maxUploadsPerDay: number;
	maxUploadsPerUser: number;
	inviteExpiryDays: number;
	sessionExpiryDays: number;
	dmcaEmail: string;
}

export interface SessionUser {
	id: number;
	username: string;
	role: Role;
	status: UserStatus;
	createdAt: string;
	lastLoginAt: string | null;
}
