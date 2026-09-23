ALTER TABLE `user` ADD `stripe_customer_id` text;
--> statement-breakpoint
CREATE TABLE `subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`plan` text NOT NULL,
	`reference_id` text NOT NULL,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`status` text DEFAULT 'incomplete',
	`period_start` integer,
	`period_end` integer,
	`trial_start` integer,
	`trial_end` integer,
	`cancel_at_period_end` integer DEFAULT false,
	`cancel_at` integer,
	`canceled_at` integer,
	`ended_at` integer,
	`seats` integer,
	`billing_interval` text,
	`stripe_schedule_id` text
);
--> statement-breakpoint
CREATE INDEX `subscription_reference_id_idx` ON `subscription` (`reference_id`);
--> statement-breakpoint
CREATE INDEX `subscription_stripe_subscription_id_idx` ON `subscription` (`stripe_subscription_id`);
