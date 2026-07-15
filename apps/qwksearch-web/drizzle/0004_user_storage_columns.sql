ALTER TABLE `user` ADD `storage_used_bytes` integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `user` ADD `storage_quota_bytes` integer DEFAULT 1073741824;
