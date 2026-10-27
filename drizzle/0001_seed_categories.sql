-- Starting category list (see DRAFT.md). Editable later in the backoffice.
INSERT INTO `category` (`id`, `name`, `slug`, `sort_order`) VALUES
	(lower(hex(randomblob(16))), 'Desporto', 'desporto', 1),
	(lower(hex(randomblob(16))), 'Política', 'politica', 2),
	(lower(hex(randomblob(16))), 'Sociedade', 'sociedade', 3),
	(lower(hex(randomblob(16))), 'Cultura e Tradições', 'cultura-e-tradicoes', 4),
	(lower(hex(randomblob(16))), 'Religião', 'religiao', 5),
	(lower(hex(randomblob(16))), 'Ocorrências', 'ocorrencias', 6),
	(lower(hex(randomblob(16))), 'Solidariedade', 'solidariedade', 7),
	(lower(hex(randomblob(16))), 'Entrevistas e Opinião', 'entrevistas-e-opiniao', 8);
