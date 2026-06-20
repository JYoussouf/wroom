import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

/**
 * Device (out-of-app) push scaffolding.
 *
 * Scope: this wires the *client* side — foreground display behavior, the OS
 * permission flow, and Expo push-token acquisition. Actual remote delivery
 * (the Worker storing tokens and calling the Expo Push API on events) is a
 * follow-up: the server today only does room sync, with no per-event pipeline.
 */

// Foreground behavior: show a banner, don't badge/sound by default. SDK 56 uses
// shouldShowBanner/shouldShowList (the old shouldShowAlert is deprecated).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export interface PushRegistration {
  granted: boolean;
  /** Expo push token, when obtainable (needs a project id / dev build). */
  token: string | null;
}

function projectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined
  );
}

/**
 * Request notification permission and (best-effort) fetch an Expo push token.
 * Returns `granted:false` on simulators or when the user declines. Never throws.
 */
export async function registerForPush(): Promise<PushRegistration> {
  if (!Device.isDevice) return { granted: false, token: null };

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return { granted: false, token: null };

  let token: string | null = null;
  try {
    const res = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    token = res.data;
  } catch {
    // No project id configured yet (or offline) — permission is still granted;
    // the token can be fetched once remote delivery lands.
    token = null;
  }
  return { granted: true, token };
}
