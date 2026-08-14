CREATE TABLE `resource_favorite` (
	`user_id` text NOT NULL,
	`resource_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resource_id`) REFERENCES `resource`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resource_favorite_user_resource_idx` ON `resource_favorite` (`user_id`,`resource_id`);--> statement-breakpoint
CREATE INDEX `resource_favorite_user_idx` ON `resource_favorite` (`user_id`);--> statement-breakpoint
INSERT OR IGNORE INTO `resource_favorite` (`user_id`, `resource_id`, `created_at`)
SELECT `owner_id`, `id`, `updated_at` FROM `resource`
WHERE `is_favorite` = 1 AND `deleted_at` IS NULL;
