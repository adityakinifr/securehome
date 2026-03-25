import { getAdapters, json } from "@/lib/api-helpers";
import { runNightCheck } from "@/lib/services/night-check";

export async function POST() {
  const adapters = await getAdapters();
  const result = await runNightCheck(adapters);
  const locked: string[] = [];

  for (const lockDev of result.unlocked_locks) {
    for (const adapter of adapters) {
      if (await adapter.lock(lockDev.id)) {
        locked.push(lockDev.name);
        break;
      }
    }
  }

  return json({ result, auto_locked: locked });
}
