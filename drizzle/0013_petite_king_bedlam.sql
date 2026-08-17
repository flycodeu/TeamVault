ALTER TABLE `file` ADD `folder` text DEFAULT '/' NOT NULL;--> statement-breakpoint
CREATE INDEX `file_resource_folder_idx` ON `file` (`resource_id`,`folder`);