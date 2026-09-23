import type { AppConfig, SessionUser } from '$lib/types';

declare global {
	namespace App {
		interface Locals {
			user: SessionUser | null;
			config: AppConfig;
		}
	}
}

export {};
