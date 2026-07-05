CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `articleCache` (
	`id` integer PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`cite` text,
	`author` text,
	`author_cite` text,
	`author_short` text,
	`author_type` text,
	`date` text,
	`source` text,
	`word_count` integer,
	`html` text,
	`followUpQuestions` text DEFAULT '[]',
	`hitCount` integer DEFAULT 0 NOT NULL,
	`lastAccessed` integer DEFAULT (unixepoch()) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`expiresAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articleCache_url_unique` ON `articleCache` (`url`);--> statement-breakpoint
CREATE TABLE `articleQA` (
	`id` integer PRIMARY KEY NOT NULL,
	`articleUrl` text NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`articleUrl`) REFERENCES `articleCache`(`url`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chats` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`createdAt` text NOT NULL,
	`focusMode` text NOT NULL,
	`userId` text,
	`files` text DEFAULT '[]',
	`thinkingTimeLimit` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`title` text,
	`content` text DEFAULT '',
	`parentId` integer,
	`isExpanded` integer DEFAULT 0,
	`isFolder` integer DEFAULT 0,
	`type` integer DEFAULT 0,
	`summary` text,
	`cite` text,
	`author` text,
	`html` text,
	`url` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`userId` text,
	`metadata` text,
	`sharing` text,
	FOREIGN KEY (`parentId`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_documents_parentId` ON `documents` (`parentId`);--> statement-breakpoint
CREATE INDEX `idx_documents_userId` ON `documents` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_documents_createdAt` ON `documents` (`createdAt`);--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` integer PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`cite` text,
	`author` text,
	`author_cite` text,
	`date` text,
	`source` text,
	`word_count` integer,
	`html` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `google_docs_sync` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`documentId` text NOT NULL,
	`googleDocId` text NOT NULL,
	`lastSyncedAt` text NOT NULL,
	`userId` text,
	FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_google_docs_sync_documentId` ON `google_docs_sync` (`documentId`);--> statement-breakpoint
CREATE INDEX `idx_google_docs_sync_googleDocId` ON `google_docs_sync` (`googleDocId`);--> statement-breakpoint
CREATE UNIQUE INDEX `google_docs_sync_documentId_googleDocId_unique` ON `google_docs_sync` (`documentId`,`googleDocId`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`chatId` text NOT NULL,
	`userId` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`messageId` text NOT NULL,
	`content` text,
	`sources` text DEFAULT '[]'
);
--> statement-breakpoint
CREATE TABLE `research_quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`documentId` text NOT NULL,
	`text` text NOT NULL,
	`source` text,
	`author` text,
	`url` text,
	`pageNumber` text,
	`tags` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_research_quotes_documentId` ON `research_quotes` (`documentId`);--> statement-breakpoint
CREATE INDEX `idx_research_quotes_tags` ON `research_quotes` (`tags`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `share_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`documentId` text NOT NULL,
	`createdAt` text NOT NULL,
	`expiresAt` text,
	FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_share_tokens_documentId` ON `share_tokens` (`documentId`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer NOT NULL,
	`image` text,
	`trial_allowed` integer DEFAULT 6 NOT NULL,
	`api_key` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
