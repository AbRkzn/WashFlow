CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text,
	`customer_id` text,
	`service_id` text,
	`job_id` text,
	`date` text NOT NULL,
	`slot_start` integer NOT NULL,
	`duration_minutes` integer DEFAULT 30 NOT NULL,
	`status` text DEFAULT 'booked' NOT NULL,
	`rescheduled` integer DEFAULT false NOT NULL,
	`rescheduled_from` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`server_seq` integer,
	`deleted_at` integer,
	`origin_device` text,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`server_seq` integer,
	`deleted_at` integer,
	`origin_device` text
);
--> statement-breakpoint
CREATE INDEX `appointments_date_idx` ON `appointments` (`date`, `slot_start`);
--> statement-breakpoint
CREATE INDEX `appointments_status_idx` ON `appointments` (`status`);
