import { getAdapters, json } from "@/lib/api-helpers";

export async function GET() {
  const adapters = await getAdapters();
  return json({
    status: "ok",
    adapters: adapters.map((a) => a.name),
  });
}
