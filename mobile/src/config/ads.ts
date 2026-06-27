// AdMob configuration + initialization.
//
// Inline "Sponsored" cards in the feed are AdMob **Native Ads**. Right now this
// uses Google's official TEST ad unit IDs, which always serve test creatives and
// are safe to ship in development/TestFlight. They are also used automatically
// whenever __DEV__ is true.
//
// TO GO LIVE WITH REAL ADS:
//   1. Create an AdMob account, register the iOS + Android apps, and a Native
//      ad unit for each. (https://admob.google.com)
//   2. Put the real **App IDs** (ca-app-pub-…~…) into the
//      `react-native-google-mobile-ads` plugin block in app.json (currently the
//      Google sample App IDs), then rebuild.
//   3. Drop the real **ad unit IDs** (ca-app-pub-…/…) into NATIVE_AD_UNIT below.
// Until then, leaving the placeholders falls back to test ads — never show real
// ads against a not-yet-approved account or you risk an AdMob policy strike.

import { Platform } from "react-native";
import mobileAds, { MaxAdContentRating, TestIds } from "react-native-google-mobile-ads";
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
  PermissionStatus,
} from "expo-tracking-transparency";

// Real native ad unit IDs, once you have them. Leave empty to use test ads.
const REAL_NATIVE_AD_UNIT = {
  ios: "", // e.g. "ca-app-pub-XXXXXXXX/XXXXXXXX"
  android: "", // e.g. "ca-app-pub-XXXXXXXX/XXXXXXXX"
};

/** The native ad unit to request. Test ID in dev or whenever a real ID is unset. */
export const NATIVE_AD_UNIT: string = (() => {
  if (__DEV__) return TestIds.NATIVE;
  const real = Platform.select(REAL_NATIVE_AD_UNIT) ?? "";
  return real || TestIds.NATIVE;
})();

let initialized = false;

/**
 * Initialize AdMob once at app boot. Asks for App Tracking Transparency first
 * (iOS) so the SDK can serve personalized ads when granted; either way ads still
 * load (non-personalized if declined). Safe to call more than once.
 */
export async function initAds(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    // Ask for ATT on iOS only if not yet decided. Android has no ATT prompt.
    if (Platform.OS === "ios") {
      const { status } = await getTrackingPermissionsAsync();
      if (status === PermissionStatus.UNDETERMINED) {
        await requestTrackingPermissionsAsync();
      }
    }

    await mobileAds().setRequestConfiguration({
      // wroom targets 16+, so keep ad content rating teen-appropriate.
      maxAdContentRating: MaxAdContentRating.T,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });

    await mobileAds().initialize();
  } catch {
    // Never let ad setup crash app boot; the feed just renders without ads.
  }
}
