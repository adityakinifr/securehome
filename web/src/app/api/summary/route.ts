import { json } from "@/lib/api-helpers";
import { generateVisitorSummary } from "@/lib/services/visitor-summary";

export async function GET() {
  return json(generateVisitorSummary());
}
