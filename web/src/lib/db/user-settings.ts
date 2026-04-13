import { eq } from "drizzle-orm";
import { db, schema } from "./index";
import { encrypt, decrypt } from "./crypto";
import type { UserSettings } from "./schema";

export async function getUserSettings(
  userId: string
): Promise<UserSettings | null> {
  const rows = await db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  // Decrypt passwords
  return {
    ...row,
    schlagePassword: row.schlagePassword
      ? decrypt(row.schlagePassword)
      : null,
    kasaPassword: row.kasaPassword ? decrypt(row.kasaPassword) : null,
  };
}

export async function upsertUserSettings(
  userId: string,
  email: string,
  data: {
    sdmEnabled?: boolean;
    sdmProjectId?: string;
    schlageEnabled?: boolean;
    schlageUsername?: string;
    schlagePassword?: string;
    kasaEnabled?: boolean;
    kasaUsername?: string;
    kasaPassword?: string;
    nightCheckHour?: string;
    autoLockEnabled?: boolean;
  }
): Promise<void> {
  const existing = await db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId))
    .limit(1);

  const encrypted = {
    ...data,
    schlagePassword: data.schlagePassword
      ? encrypt(data.schlagePassword)
      : undefined,
    kasaPassword: data.kasaPassword
      ? encrypt(data.kasaPassword)
      : undefined,
    updatedAt: new Date(),
  };

  if (existing.length === 0) {
    await db.insert(schema.userSettings).values({
      userId,
      email,
      ...encrypted,
    });
  } else {
    await db
      .update(schema.userSettings)
      .set(encrypted)
      .where(eq(schema.userSettings.userId, userId));
  }
}

export async function deleteUserSettings(userId: string): Promise<void> {
  await db
    .delete(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId));
}
