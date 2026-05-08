PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TABLE `note`;--> statement-breakpoint
DROP TABLE `highlight`;--> statement-breakpoint
DROP TABLE `progress`;--> statement-breakpoint
DROP TABLE `shelf_document`;--> statement-breakpoint
DROP TABLE `shelf`;--> statement-breakpoint
DROP TABLE `document`;--> statement-breakpoint
CREATE TABLE `__new_conversation` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`primary_doc_id` text,
	`created_at` integer NOT NULL,
	`last_activity_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_conversation`("id", "user_id", "title", "primary_doc_id", "created_at", "last_activity_at") SELECT "id", "user_id", "title", "primary_doc_id", "created_at", "last_activity_at" FROM `conversation`;--> statement-breakpoint
DROP TABLE `conversation`;--> statement-breakpoint
ALTER TABLE `__new_conversation` RENAME TO `conversation`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `conversation_user_id_last_activity_idx` ON `conversation` (`user_id`,`last_activity_at`);--> statement-breakpoint
CREATE INDEX `conversation_primary_doc_id_idx` ON `conversation` (`primary_doc_id`);
