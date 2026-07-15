CREATE TABLE `uploads` (
	`fileId` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`fileName` text NOT NULL,
	`fileExtension` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_uploads_userId` ON `uploads` (`userId`);
