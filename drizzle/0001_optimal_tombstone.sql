CREATE TABLE `resource` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'OTHER' NOT NULL,
	`description` text,
	`url` text,
	`host` text,
	`ip` text,
	`port` integer,
	`visibility` text DEFAULT 'TEAM' NOT NULL,
	`sensitivity` text DEFAULT 'NORMAL' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`owner_id` text NOT NULL,
	`created_by` text NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `resource_owner_idx` ON `resource` (`owner_id`);--> statement-breakpoint
CREATE INDEX `resource_status_idx` ON `resource` (`status`);