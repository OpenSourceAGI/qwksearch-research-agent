CREATE TABLE `news_articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`topic` text NOT NULL,
	`topic_source` text DEFAULT 'wikipedia_daily_top' NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`source` text,
	`image_url` text,
	`published_at` text,
	`wiki_rank` integer,
	`wiki_views` integer,
	`first_seen_at` integer DEFAULT (unixepoch()) NOT NULL,
	`fetched_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `news_articles_topic_url` ON `news_articles` (`topic`,`url`);
--> statement-breakpoint
CREATE INDEX `idx_news_articles_topic` ON `news_articles` (`topic`);
--> statement-breakpoint
CREATE INDEX `idx_news_articles_fetchedAt` ON `news_articles` (`fetched_at`);
--> statement-breakpoint
CREATE TABLE `news_widget_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`default_topics` text DEFAULT '' NOT NULL,
	`allow_user_topics` integer DEFAULT true NOT NULL,
	`max_topics` integer DEFAULT 6 NOT NULL,
	`show_images` integer DEFAULT true NOT NULL,
	`cache_minutes` integer DEFAULT 10 NOT NULL,
	`retention_days` integer DEFAULT 30 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_by` text
);
