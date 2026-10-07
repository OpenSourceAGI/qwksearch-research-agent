CREATE TABLE `learn_playlists` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`data` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_learn_playlists_owner` ON `learn_playlists` (`owner_id`);
--> statement-breakpoint
CREATE TABLE `learn_playlist_members` (
	`playlist_id` text NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`invite_token` text,
	PRIMARY KEY(`playlist_id`, `email`),
	FOREIGN KEY (`playlist_id`) REFERENCES `learn_playlists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learn_playlist_members_invite_token_unique` ON `learn_playlist_members` (`invite_token`);
--> statement-breakpoint
CREATE INDEX `idx_learn_playlist_members_user` ON `learn_playlist_members` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_learn_playlist_members_email` ON `learn_playlist_members` (`email`);
