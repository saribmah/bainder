CREATE TABLE `shelf` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`position` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shelf_user_id_name_lower_idx` ON `shelf` (`user_id`,lower("name"));--> statement-breakpoint
CREATE INDEX `shelf_user_id_position_idx` ON `shelf` (`user_id`,`position`,`created_at`);--> statement-breakpoint
CREATE TABLE `shelf_document` (
	`shelf_id` text NOT NULL,
	`document_id` text NOT NULL,
	`user_id` text NOT NULL,
	`position` real,
	`added_at` integer NOT NULL,
	PRIMARY KEY(`shelf_id`, `document_id`),
	FOREIGN KEY (`shelf_id`) REFERENCES `shelf`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shelf_document_document_id_idx` ON `shelf_document` (`document_id`);--> statement-breakpoint
CREATE INDEX `shelf_document_shelf_position_idx` ON `shelf_document` (`shelf_id`,`position`,`added_at`);