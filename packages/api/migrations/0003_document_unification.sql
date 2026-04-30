-- Document unification: subsume the per-format `epub_book`/`epub_chapter` tables
-- under a unified `document` parent and add per-format children for PDF, image,
-- and text. The old EPUB tables are dropped wholesale (dev-only at this point —
-- no production data to preserve).
DROP TABLE IF EXISTS `epub_chapter`;--> statement-breakpoint
DROP TABLE IF EXISTS `epub_book`;--> statement-breakpoint
CREATE TABLE `document` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`mime_type` text NOT NULL,
	`original_filename` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`title` text NOT NULL,
	`sensitive` integer DEFAULT false NOT NULL,
	`status` text NOT NULL,
	`error_reason` text,
	`r2_key_original` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `document_user_id_created_at_idx` ON `document` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `document_user_id_sha256_idx` ON `document` (`user_id`,`sha256`);--> statement-breakpoint
CREATE TABLE `epub_book` (
	`document_id` text PRIMARY KEY NOT NULL,
	`authors` text NOT NULL,
	`language` text NOT NULL,
	`description` text,
	`publisher` text,
	`published_date` text,
	`identifiers` text NOT NULL,
	`subjects` text NOT NULL,
	`toc` text NOT NULL,
	`cover_image` text,
	`chapter_count` integer NOT NULL,
	`word_count` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `epub_chapter` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`order` integer NOT NULL,
	`href` text NOT NULL,
	`title` text NOT NULL,
	`html` text NOT NULL,
	`text` text NOT NULL,
	`word_count` integer NOT NULL,
	`linear` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `epub_book`(`document_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `epub_chapter_document_order_uq` ON `epub_chapter` (`document_id`,`order`);--> statement-breakpoint
CREATE TABLE `pdf_document` (
	`document_id` text PRIMARY KEY NOT NULL,
	`page_count` integer NOT NULL,
	`pdf_title` text,
	`pdf_author` text,
	`pdf_producer` text,
	`pdf_creator` text,
	`pdf_metadata` text,
	FOREIGN KEY (`document_id`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pdf_page` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`page_number` integer NOT NULL,
	`text` text NOT NULL,
	`word_count` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `pdf_document`(`document_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pdf_page_document_page_uq` ON `pdf_page` (`document_id`,`page_number`);--> statement-breakpoint
CREATE TABLE `image_document` (
	`document_id` text PRIMARY KEY NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`format` text NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `text_document` (
	`document_id` text PRIMARY KEY NOT NULL,
	`charset` text NOT NULL,
	`text` text NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE cascade
);
