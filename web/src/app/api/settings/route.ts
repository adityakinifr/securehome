import { auth } from "@/auth";
import { json, errorResponse } from "@/lib/api-helpers";
import { getUserSettings, upsertUserSettings } from "@/lib/db/user-settings";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return errorResponse("Unauthorized", 401);

  const userId = session.user.id || session.user.email;
  try {
    const settings = await getUserSettings(userId);
    if (!settings) {
      return json({
        sdm_enabled: false,
        sdm_project_id: "",
        schlage_enabled: false,
        schlage_username: "",
        kasa_enabled: false,
        kasa_username: "",
        night_check_hour: "22:00",
        auto_lock_enabled: false,
      });
    }
    return json({
      sdm_enabled: settings.sdmEnabled,
      sdm_project_id: settings.sdmProjectId || "",
      schlage_enabled: settings.schlageEnabled,
      schlage_username: settings.schlageUsername || "",
      kasa_enabled: settings.kasaEnabled,
      kasa_username: settings.kasaUsername || "",
      night_check_hour: settings.nightCheckHour || "22:00",
      auto_lock_enabled: settings.autoLockEnabled,
    });
  } catch {
    return json({
      sdm_enabled: false,
      sdm_project_id: "",
      schlage_enabled: false,
      schlage_username: "",
      kasa_enabled: false,
      kasa_username: "",
      night_check_hour: "22:00",
      auto_lock_enabled: false,
    });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return errorResponse("Unauthorized", 401);

  const userId = session.user.id || session.user.email;
  const body = await req.json();

  try {
    await upsertUserSettings(userId, session.user.email, {
      sdmEnabled: body.sdm_enabled,
      sdmProjectId: body.sdm_project_id,
      schlageEnabled: body.schlage_enabled,
      schlageUsername: body.schlage_username,
      schlagePassword: body.schlage_password,
      kasaEnabled: body.kasa_enabled,
      kasaUsername: body.kasa_username,
      kasaPassword: body.kasa_password,
      nightCheckHour: body.night_check_hour,
      autoLockEnabled: body.auto_lock_enabled,
    });
    return json({ status: "saved" });
  } catch (e) {
    console.error("Failed to save settings:", e);
    return errorResponse("Failed to save settings");
  }
}
