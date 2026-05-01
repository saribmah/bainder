-- User annotations on documents (color highlights and notes). Position is
-- encoded as a chapter or page reference plus character offsets into the
-- canonical text payload (epub_chapter.html's textContent for EPUBs,
-- pdf_page.text for PDFs). Exactly one of epub_chapter_order /
-- pdf_page_number is set per row.
CREATE TABLE `highlight` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`document_id` text NOT NULL,
	`epub_chapter_order` integer,
	`pdf_page_number` integer,
	`offset_start` integer NOT NULL,
	`offset_end` integer NOT NULL,
	`text_snippet` text NOT NULL,
	`color` text NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `highlight_target_xor` CHECK ((`epub_chapter_order` IS NULL) <> (`pdf_page_number` IS NULL)),
	CONSTRAINT `highlight_offset_range` CHECK (`offset_start` <= `offset_end`)
);
--> statement-breakpoint
CREATE INDEX `highlight_document_id_created_at_idx` ON `highlight` (`document_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `highlight_user_id_created_at_idx` ON `highlight` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `highlight_document_chapter_idx` ON `highlight` (`document_id`,`epub_chapter_order`);--> statement-breakpoint
CREATE INDEX `highlight_document_page_idx` ON `highlight` (`document_id`,`pdf_page_number`);
