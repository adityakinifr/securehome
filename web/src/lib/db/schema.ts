import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * User settings — stores per-user API credentials for each adapter.
 * Credentials are encrypted before storage (see crypto.ts).
 */
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }),

  // SDM / Google Nest
  sdmEnabled: boolean("sdm_enabled").default(false),
  sdmProjectId: text("sdm_project_id"),
  // SDM tokens come from the NextAuth Google OAuth flow, not stored here

  // Schlage
  schlageEnabled: boolean("schlage_enabled").default(false),
  schlageUsername: text("schlage_username"),
  schlagePassword: text("schlage_password"), // encrypted

  // Kasa / Tapo
  kasaEnabled: boolean("kasa_enabled").default(false),
  kasaUsername: text("kasa_username"),
  kasaPassword: text("kasa_password"), // encrypted

  // Preferences
  nightCheckHour: varchar("night_check_hour", { length: 5 }).default("22:00"),
  autoLockEnabled: boolean("auto_lock_enabled").default(false),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
