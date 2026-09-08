import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const submissions = sqliteTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    message: text("message").notNull().default(""),
    objectKey: text("object_key").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    width: integer("width").notNull().default(0),
    height: integer("height").notNull().default(0),
    status: text("status", { enum: ["pending", "approved", "rejected"] })
      .notNull()
      .default("pending"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    reviewedAt: text("reviewed_at"),
    reviewedBy: text("reviewed_by"),
  },
  (table) => [index("idx_submissions_status_created").on(table.status, table.createdAt)],
);

export const displaySettings = sqliteTable("display_settings", {
  id: integer("id").primaryKey(),
  durationSeconds: integer("duration_seconds").notNull().default(7),
  fadeSeconds: real("fade_seconds").notNull().default(2),
  backgroundsJson: text("backgrounds_json").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const eventOperators = sqliteTable("event_operators", {
  email: text("email").primaryKey(),
  role: text("role", { enum: ["operator"] }).notNull().default("operator"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
