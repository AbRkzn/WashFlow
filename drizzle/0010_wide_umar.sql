CREATE TABLE `day_closes` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`closed_by` text,
	`closed_at` integer NOT NULL,
	`job_count` integer NOT NULL,
	`revenue_cents` integer NOT NULL,
	`voided_count` integer NOT NULL,
	`voided_amount_cents` integer NOT NULL,
	`expenses_cents` integer NOT NULL,
	`expected_cash_cents` integer NOT NULL,
	`declared_cash_cents` integer NOT NULL,
	`variance_cents` integer NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`server_seq` integer,
	`deleted_at` integer,
	`origin_device` text,
	FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `day_closes_day_unique` ON `day_closes` (`day`);
CREATE INDEX `day_closes_day_idx` ON `day_closes` (`day`);