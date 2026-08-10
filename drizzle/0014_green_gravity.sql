CREATE TABLE `service_inventory_items` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`inventory_item_id` text NOT NULL,
	`quantity_used` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`server_seq` integer,
	`deleted_at` integer,
	`origin_device` text,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE INDEX `service_inventory_service_id_idx` ON `service_inventory_items` (`service_id`);
CREATE INDEX `service_inventory_item_id_idx` ON `service_inventory_items` (`inventory_item_id`);
