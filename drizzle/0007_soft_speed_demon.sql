CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`amount_cents` integer NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`description` text,
	`incurred_at` integer NOT NULL,
	`logged_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`server_seq` integer,
	`deleted_at` integer,
	`origin_device` text,
	FOREIGN KEY (`logged_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'supplies' NOT NULL,
	`unit` text DEFAULT 'pc' NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`low_stock_threshold` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`server_seq` integer,
	`deleted_at` integer,
	`origin_device` text
);
--> statement-breakpoint
CREATE TABLE `stock_adjustments` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`change_qty` integer NOT NULL,
	`type` text DEFAULT 'correction' NOT NULL,
	`reason` text,
	`adjusted_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`server_seq` integer,
	`deleted_at` integer,
	`origin_device` text,
	FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`adjusted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stock_adjustments_item_id_idx` ON `stock_adjustments` (`item_id`);
--> statement-breakpoint
CREATE INDEX `expenses_incurred_at_idx` ON `expenses` (`incurred_at`);
--> statement-breakpoint
CREATE INDEX `expenses_category_idx` ON `expenses` (`category`);
