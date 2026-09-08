CREATE TABLE `event_operators` (
	`email` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'operator' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
