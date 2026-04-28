CREATE TABLE `epub_book` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`authors` text NOT NULL,
	`language` text NOT NULL,
	`description` text,
	`publisher` text,
	`published_date` text,
	`identifiers` text NOT NULL,
	`subjects` text NOT NULL,
	`toc` text NOT NULL,
	`chapter_count` integer NOT NULL,
	`word_count` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `epub_book_user_id_idx` ON `epub_book` (`user_id`);--> statement-breakpoint
CREATE TABLE `epub_chapter` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`order` integer NOT NULL,
	`href` text NOT NULL,
	`title` text NOT NULL,
	`html` text NOT NULL,
	`text` text NOT NULL,
	`word_count` integer NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `epub_book`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `epub_chapter_book_order_uq` ON `epub_chapter` (`book_id`,`order`);