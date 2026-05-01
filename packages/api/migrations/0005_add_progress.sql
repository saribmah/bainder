-- Reading-progress state: at most one row per (user, document). The
-- composite primary key replaces a synthetic id; upserts overwrite in
-- place. Exactly one of epub_chapter_order / pdf_page_number is set per
-- row (CHECK constraint).
CREATE TABLE `progress` (
	`user_id` text NOT NULL,
	`document_id` text NOT NULL,
	`epub_chapter_order` integer,
	`pdf_page_number` integer,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `document_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `progress_target_xor` CHECK ((`epub_chapter_order` IS NULL) <> (`pdf_page_number` IS NULL))
);
--> statement-breakpoint
CREATE INDEX `progress_user_id_updated_at_idx` ON `progress` (`user_id`,`updated_at`);
