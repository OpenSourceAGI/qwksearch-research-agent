CREATE TABLE `uploads` (
	`fileId` text PRIMARY KEY NOT NULL,
	`userId` text,
	`fileName` text NOT NULL,
	`fileExtension` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_uploads_userId` ON `uploads` (`userId`);--> statement-breakpoint
ALTER TABLE `user` ADD `storage_used_bytes` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user` ADD `storage_quota_bytes` integer DEFAULT 1073741824;