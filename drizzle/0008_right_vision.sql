CREATE TABLE `page_menu_item` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`label` text NOT NULL,
	`href` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `page`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `page_menu_item_page_idx` ON `page_menu_item` (`page_id`);--> statement-breakpoint
ALTER TABLE `page` ADD `show_in_menu` integer DEFAULT false NOT NULL;