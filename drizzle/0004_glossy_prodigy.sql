CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`kind` text NOT NULL,
	`uri` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`server_seq` integer,
	`deleted_at` integer,
	`origin_device` text,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `photos_job_id_idx` ON `photos` (`job_id`);
