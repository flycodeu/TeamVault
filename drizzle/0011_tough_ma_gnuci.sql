CREATE TABLE IF NOT EXISTS `memo` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`color` text DEFAULT 'bg-card' NOT NULL,
	`visibility` text DEFAULT 'PRIVATE' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `share` ADD `allow_credentials` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `share` ADD `credential_ids` text;--> statement-breakpoint
ALTER TABLE `share` ADD `file_ids` text;