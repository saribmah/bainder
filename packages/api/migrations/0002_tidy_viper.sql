ALTER TABLE `epub_book` ADD `cover_image` text;--> statement-breakpoint
ALTER TABLE `epub_chapter` ADD `linear` integer DEFAULT true NOT NULL;