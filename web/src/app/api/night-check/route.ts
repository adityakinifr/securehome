import { getAdapters, json } from "@/lib/api-helpers";
import { runNightCheck } from "@/lib/services/night-check";

export async function GET() {
  const adapters = await getAdapters();
  const result = await runNightCheck(adapters);
  return json(result);
}
