CREATE TABLE `profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`reading_theme` text DEFAULT 'light' NOT NULL,
	`reading_font` text DEFAULT 'newsreader' NOT NULL,
	`default_highlight_color` text DEFAULT 'pink' NOT NULL,
	`ai_cite_pages` integer DEFAULT true NOT NULL,
	`ai_suggest_followups` integer DEFAULT true NOT NULL,
	`ai_personalize_from_highlights` integer DEFAULT false NOT NULL,
	`notify_daily_nudge` integer DEFAULT true NOT NULL,
	`notify_weekly_digest` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
