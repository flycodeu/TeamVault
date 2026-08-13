CREATE TABLE `credential_permission` (
	`id` text PRIMARY KEY NOT NULL,
	`credential_id` text NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`credential_id`) REFERENCES `credential`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credential_permission_subject_idx` ON `credential_permission` (`credential_id`,`subject_type`,`subject_id`);--> statement-breakpoint
CREATE TABLE `resource_collection` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resource_collection_name_unique` ON `resource_collection` (`name`);--> statement-breakpoint
ALTER TABLE `credential` ADD `access_mode` text DEFAULT 'RESOURCE' NOT NULL;--> statement-breakpoint
ALTER TABLE `resource` ADD `collection_id` text REFERENCES resource_collection(id);