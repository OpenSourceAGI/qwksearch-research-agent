CREATE TABLE `card_text_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`documentKey` text NOT NULL,
	`documentTitle` text,
	`referenceKey` text NOT NULL,
	`referenceLabel` text,
	`submittedText` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`submitterIpHash` text,
	`userId` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reviewedAt` text,
	`reviewedBy` text
);
--> statement-breakpoint
CREATE INDEX `idx_card_text_submissions_card` ON `card_text_submissions` (`documentKey`,`referenceKey`);
--> statement-breakpoint
CREATE INDEX `idx_card_text_submissions_status_createdAt` ON `card_text_submissions` (`status`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `idx_card_text_submissions_ip_createdAt` ON `card_text_submissions` (`submitterIpHash`,`createdAt`);
