CREATE TABLE `note` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`document_id` text NOT NULL,
	`section_key` text,
	`highlight_id` text,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`highlight_id`) REFERENCES `highlight`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `note_document_id_created_at_idx` ON `note` (`document_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `note_user_id_created_at_idx` ON `note` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `note_highlight_id_idx` ON `note` (`highlight_id`);--> statement-breakpoint
CREATE INDEX `note_document_section_idx` ON `note` (`document_id`,`section_key`);--> statement-breakpoint
ALTER TABLE `highlight` DROP COLUMN `note`;