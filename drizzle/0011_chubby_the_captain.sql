CREATE TABLE `photo_uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`photo_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `photos` ADD `uploaded_at` integer;
--> statement-breakpoint
CREATE INDEX `photo_uploads_status_idx` ON `photo_uploads` (`status`);
CREATE INDEX `photo_uploads_photo_id_idx` ON `photo_uploads` (`photo_id`);
