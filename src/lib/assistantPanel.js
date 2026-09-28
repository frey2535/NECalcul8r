/** Open the in-app assistant side panel without leaving the current screen. */
export const OPEN_ASSISTANT_EVENT = "necalcul8r-open-assistant";

export function openAssistantPanel() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT));
}
