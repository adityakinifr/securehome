import { NextRequest } from "next/server";
import { json, errorResponse } from "@/lib/api-helpers";
import { buildAdapters } from "@/lib/adapters";
import { runNightCheck } from "@/lib/services/night-check";

/**
 * Vercel Cron job — runs every night at 10 PM UTC.
 * Checks all locks/doors and auto-locks any unlocked Schlage locks.
 *
 * Protected by CRON_SECRET to prevent unauthorized invocation.
 */
export async function GET(req: NextRequest) {
  // Verify the request comes from Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return errorResponse("Unauthorized", 401);
  }

  // Build adapters without SDM token (cron has no user session)
  // Schlage and Kasa still work via env var credentials
  const adapters = buildAdapters();
  const result = await runNightCheck(adapters);

  // Auto-lock any unlocked locks
  const locked: string[] = [];
  for (const lockDev of result.unlocked_locks) {
    for (const adapter of adapters) {
      if (await adapter.lock(lockDev.id)) {
        locked.push(lockDev.name);
        break;
      }
    }
  }

  console.log(
    `[Night Check Cron] Secure: ${result.all_secure}, Auto-locked: ${locked.join(", ") || "none"}`
  );

  return json({
    checked_at: result.checked_at,
    all_secure: result.all_secure,
    unlocked_locks: result.unlocked_locks.length,
    open_doors: result.open_doors.length,
    auto_locked: locked,
  });
}
