PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`chatId` text NOT NULL,
	`userId` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`messageId` text NOT NULL,
	`content` text,
	`sources` text DEFAULT '[]',
	`suggestions` text DEFAULT '[]'
);
--> statement-breakpoint
INSERT INTO `__new_messages`("id", "type", "chatId", "userId", "createdAt", "messageId", "content", "sources", "suggestions") SELECT "id", "type", "chatId", "userId", "createdAt", "messageId", "content", "sources", "suggestions" FROM `messages`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
ALTER TABLE `__new_messages` RENAME TO `messages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;