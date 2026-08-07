CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`server_seq` integer,
	`deleted_at` integer,
	`origin_device` text
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text,
	`plate_number` text NOT NULL,
	`make` text,
	`model` text,
	`color` text,
	`year` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`server_seq` integer,
	`deleted_at` integer,
	`origin_device` text,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price_cents` integer NOT NULL,
	`duration_minutes` integer DEFAULT 30 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`server_seq` integer,
	`deleted_at` integer,
	`origin_device` text
);
--> statement-breakpoint
CREATE INDEX `vehicles_plate_number_idx` ON `vehicles` (`plate_number`);
--> statement-breakpoint
CREATE INDEX `vehicles_customer_id_idx` ON `vehicles` (`customer_id`);
