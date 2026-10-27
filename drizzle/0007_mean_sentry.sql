PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_comment` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text,
	`poll_id` text,
	`parent_id` text,
	`author_name` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'visible' NOT NULL,
	`report_count` integer DEFAULT 0 NOT NULL,
	`ip_hash` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `article`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`poll_id`) REFERENCES `poll`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "comment_one_target" CHECK(("__new_comment"."article_id" is null) != ("__new_comment"."poll_id" is null))
);
--> statement-breakpoint
INSERT INTO `__new_comment`("id", "article_id", "poll_id", "parent_id", "author_name", "body", "status", "report_count", "ip_hash", "created_at") SELECT "id", "article_id", NULL, "parent_id", "author_name", "body", "status", "report_count", "ip_hash", "created_at" FROM `comment`;--> statement-breakpoint
DROP TABLE `comment`;--> statement-breakpoint
ALTER TABLE `__new_comment` RENAME TO `comment`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `comment_article_idx` ON `comment` (`article_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `comment_poll_idx` ON `comment` (`poll_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `comment_ip_idx` ON `comment` (`ip_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `comment_reported_idx` ON `comment` (`report_count`);