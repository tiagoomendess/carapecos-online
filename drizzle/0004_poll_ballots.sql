ALTER TABLE `poll_vote` ADD `ballot_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `poll_vote_ballot_idx` ON `poll_vote` (`poll_id`,`ballot_id`);--> statement-breakpoint
CREATE INDEX `comment_ip_idx` ON `comment` (`ip_hash`,`created_at`);