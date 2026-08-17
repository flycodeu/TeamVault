CREATE TABLE IF NOT EXISTS `resource_link_permission` (
	`id` text PRIMARY KEY NOT NULL,
	`link_id` text NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`link_id`) REFERENCES `resource_link`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resource_link_permission_subject_idx` ON `resource_link_permission` (`link_id`,`subject_type`,`subject_id`);--> statement-breakpoint
ALTER TABLE `credential` ADD `link_id` text REFERENCES resource_link(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `credential_link_idx` ON `credential` (`link_id`);--> statement-breakpoint
ALTER TABLE `resource_link` ADD `access_mode` text DEFAULT 'RESOURCE' NOT NULL;--> statement-breakpoint
ALTER TABLE `resource` ADD `parent_id` text;--> statement-breakpoint
CREATE INDEX `resource_parent_idx` ON `resource` (`parent_id`);