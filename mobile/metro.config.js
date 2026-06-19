// Metro config: resolve the shared, platform-agnostic core that lives outside
// the Expo app (../shared) so the native app and the web app share one source.
// `@wroom/shared` is a declared `file:../shared` dependency (npm symlinks it
// into node_modules non-destructively). Metro follows the symlink, but the
// target lives outside projectRoot, so it must be watched explicitly.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Watch the shared source so its files are in Metro's map and edits hot-reload.
config.watchFolders = [path.resolve(workspaceRoot, "shared")];

// Resolve modules from the app's own node_modules (keeps a single React, etc.).
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

module.exports = config;
