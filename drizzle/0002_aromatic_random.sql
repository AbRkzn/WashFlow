CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text,
	`vehicle_id` text,
	`service_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`price_cents` integer NOT NULL,
	`assigned_to` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`server_seq` integer,
	`deleted_at` integer,
	`origin_device` text,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recent_plates` (
	`id` text PRIMARY KEY NOT NULL,
	`plate` text NOT NULL,
	`last_used_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`server_seq` integer,
	`deleted_at` integer,
	`origin_device` text
);
--> statement-breakpoint
CREATE INDEX `jobs_status_idx` ON `jobs` (`status`);
--> statement-breakpoint
CREATE INDEX `jobs_created_at_idx` ON `jobs` (`created_at`);
--> statement-breakpoint
CREATE INDEX `recent_plates_plate_idx` ON `recent_plates` (`plate`);
