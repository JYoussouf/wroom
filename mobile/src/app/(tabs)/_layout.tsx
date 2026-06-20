import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useWroomTheme } from "@/theme/theme";

export default function TabsLayout() {
  const t = useWroomTheme();
  return (
    <NativeTabs
      backgroundColor={t.bg}
      indicatorColor={t.surface2}
      labelStyle={{ selected: { color: t.accent } }}
    >
      <NativeTabs.Trigger name="feed">
        <NativeTabs.Trigger.Label>Feed</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.stack" md="dashboard" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="room">
        <NativeTabs.Trigger.Label>Wroom</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.2" md="groups" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
