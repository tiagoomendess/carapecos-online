ALTER TABLE `media` ADD `source_url` text;--> statement-breakpoint
CREATE UNIQUE INDEX `media_source_url_unique` ON `media` (`source_url`);