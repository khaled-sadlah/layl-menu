CREATE TABLE `attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`number` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`token` text NOT NULL,
	`table_number` integer NOT NULL,
	`items` text NOT NULL,
	`total` integer NOT NULL,
	`note` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_id_unique` ON `orders` (`id`);--> statement-breakpoint
CREATE INDEX `idx_orders_created` ON `orders` (`created_at`);