CREATE TABLE `file` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`original_name` text NOT NULL,
	`storage_name` text NOT NULL,
	`storage_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`extension` text,
	`size` integer NOT NULL,
	`sha256` text NOT NULL,
	`preview_status` text DEFAULT 'NONE' NOT NULL,
	`preview_path` text,
	`thumbnail_path` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resource`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `file_storage_name_unique` ON `file` (`storage_name`);--> statement-breakpoint
CREATE INDEX `file_resource_idx` ON `file` (`resource_id`);