CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text,
	`amount_cents` integer NOT NULL,
	`method` text DEFAULT 'cash' NOT NULL,
	`received_by` text,
	`paid_at` integer NOT NULL,
	`voided_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`server_seq` integer,
	`deleted_at` integer,
	`origin_device` text,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`received_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `void_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text,
	`requested_by` text,
	`reason` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`resolved_by` text,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`server_seq` integer,
	`deleted_at` integer,
	`origin_device` text,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payments_job_id_idx` ON `payments` (`job_id`);
--> statement-breakpoint
CREATE INDEX `payments_paid_at_idx` ON `payments` (`paid_at`);
--> statement-breakpoint
CREATE INDEX `void_requests_job_id_idx` ON `void_requests` (`job_id`);
--> statement-breakpoint
CREATE INDEX `void_requests_status_idx` ON `void_requests` (`status`);
