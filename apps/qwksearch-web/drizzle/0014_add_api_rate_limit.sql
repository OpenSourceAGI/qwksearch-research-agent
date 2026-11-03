CREATE TABLE `api_rate_limit_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`requests_per_window` integer DEFAULT 300 NOT NULL,
	`window_seconds` integer DEFAULT 60 NOT NULL,
	`overrides` text DEFAULT '[]' NOT NULL,
	`exempt_paths` text DEFAULT '' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_by` text
);
--> statement-breakpoint
CREATE TABLE `api_rate_limit_counters` (
	`bucket` text NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`bucket`, `window_start`)
);
--> statement-breakpoint
CREATE INDEX `idx_api_rate_limit_counters_expires_at` ON `api_rate_limit_counters` (`expires_at`);
