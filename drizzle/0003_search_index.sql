-- Full-text search over articles and polls, kept in sync by the app (src/lib/server/search.ts).
-- remove_diacritics 2 makes "carapecos" match "Carapeços".
CREATE VIRTUAL TABLE `search_index` USING fts5(
	`kind` UNINDEXED,
	`ref_id` UNINDEXED,
	`title`,
	`lead`,
	`body`,
	tokenize = 'unicode61 remove_diacritics 2'
);
