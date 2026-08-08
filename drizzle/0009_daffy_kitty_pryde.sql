CREATE TABLE `conflict_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`description` text,
	`local_row` text,
	`remote_row` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`resolution` text,
	`resolved_by` text,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`server_seq` integer,
	`deleted_at` integer,
	`origin_device` text
);
CREATE INDEX `conflict_reviews_status_idx` ON `conflict_reviews` (`status`);
CREATE INDEX `conflict_reviews_entity_idx` ON `conflict_reviews` (`entity`,`entity_id`);
