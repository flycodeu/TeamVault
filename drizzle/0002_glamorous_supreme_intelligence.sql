CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`resource_id` text,
	`target_type` text,
	`target_id` text,
	`ip` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`resource_id`) REFERENCES `resource`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_log_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_log_resource_idx` ON `audit_log` (`resource_id`);--> statement-breakpoint
CREATE TABLE `credential` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'PASSWORD' NOT NULL,
	`username` text,
	`secret_cipher` text NOT NULL,
	`extra_cipher` text,
	`description` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resource`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `credential_resource_idx` ON `credential` (`resource_id`);