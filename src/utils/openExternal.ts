import { Capacitor } from "@capacitor/core";
import { AppLauncher } from "@capacitor/app-launcher";

/** Opens a link in the phone's own browser (not inside the app). */
export async function openExternal(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await AppLauncher.openUrl({ url });
      return;
    } catch {
      // fall through to the web method
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
