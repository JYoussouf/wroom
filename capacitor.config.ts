import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.wroom.app",
  appName: "Writer's Room",
  webDir: "dist",
  ios: {
    contentInset: "always",
    backgroundColor: "#0c0a09",
  },
  server: {
    // Set to your LAN IP + vite port for live reload on device during dev:
    // url: "http://192.168.1.x:5173",
    // cleartext: true,
  },
};

export default config;
