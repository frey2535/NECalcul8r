import { supabase } from "@/api/supabaseClient";
import { isStandaloneDisplay, getInstallPlatform } from "@/lib/pwa";

const ALLOWED = new Set(["install_prompt_shown", "install_prompt_accepted", "installed", "standalone_launch"]);
function platformName() {
  const p = getInstallPlatform();
  return p.isIOS ? "ios" : p.isAndroid ? "android" : /Windows|Macintosh|Linux/i.test(navigator.userAgent || "") ? "desktop" : "other";
}
export async function trackPwaEvent(eventType) {
  if (!supabase || !ALLOWED.has(eventType)) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // anonymous installs cannot be reliably counted by this implementation
    await supabase.from("pwa_analytics_events").insert({ profile_id: user.id, event_type: eventType, platform: platformName() });
  } catch { /* Analytics must never interrupt the app. */ }
}
export function startPwaAnalytics() {
  if (typeof window === "undefined") return;
  window.addEventListener("appinstalled", () => { void trackPwaEvent("installed"); });
  if (isStandaloneDisplay()) {
    const key = "necalcul8r_pwa_launch_last";
    try {
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last > 30 * 60 * 1000) {
        sessionStorage.setItem(key, String(Date.now()));
        void trackPwaEvent("standalone_launch");
      }
    } catch { void trackPwaEvent("standalone_launch"); }
  }
}
