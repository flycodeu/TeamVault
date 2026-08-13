CREATE TABLE `resource_link` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`kind` text DEFAULT 'WEBSITE' NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`description` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resource`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `resource_link_resource_idx` ON `resource_link` (`resource_id`);--> statement-breakpoint
ALTER TABLE `resource` ADD `module_kind` text DEFAULT 'OTHER' NOT NULL;--> statement-breakpoint
UPDATE `resource` SET `module_kind` = CASE
	WHEN `type` IN ('WEBSITE', 'SOFTWARE', 'API') THEN 'TOOL'
	WHEN `type` = 'DOCUMENT' THEN 'KNOWLEDGE'
	WHEN `type` IN ('SERVER', 'DATABASE', 'DEVICE') THEN 'PROJECT'
	ELSE 'OTHER'
END;--> statement-breakpoint
INSERT INTO `resource_link` (`id`, `resource_id`, `kind`, `title`, `url`, `created_by`, `created_at`, `updated_at`)
SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
	`id`, 'WEBSITE', '访问网站', `url`, `created_by`, `created_at`, `updated_at`
FROM `resource`
WHERE `url` IS NOT NULL AND trim(`url`) <> '';
