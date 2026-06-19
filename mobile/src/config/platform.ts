// Bind the shared core's platform seam to native primitives: AsyncStorage for
// persistence and the wroom API origin. Imported for its side effect once, at
// the top of the root layout, before the store mounts.
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { configurePlatform } from "@wroom/shared";

const apiBaseUrl =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  "https://wroom-api.joseppy-workers.workers.dev";

configurePlatform({
  apiBaseUrl,
  storage: {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key) => AsyncStorage.removeItem(key),
  },
});
