CREATE TABLE `group_member` (
	`group_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'MEMBER' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `group`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `group` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_name_unique` ON `group` (`name`);--> statement-breakpoint
CREATE TABLE `preview_job` (
	`id` text PRIMARY KEY NOT NULL,
	`file_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`error` text,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	FOREIGN KEY (`file_id`) REFERENCES `file`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `resource_permission` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`can_view` integer DEFAULT true NOT NULL,
	`can_view_secret` integer DEFAULT false NOT NULL,
	`can_view_file` integer DEFAULT false NOT NULL,
	`can_download` integer DEFAULT false NOT NULL,
	`can_edit` integer DEFAULT false NOT NULL,
	`can_share` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resource`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `share` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`target_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`password_hash` text,
	`expires_at` integer,
	`allow_preview` integer DEFAULT true NOT NULL,
	`allow_download` integer DEFAULT false NOT NULL,
	`max_views` integer,
	`view_count` integer DEFAULT 0 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `share_token_hash_unique` ON `share` (`token_hash`);