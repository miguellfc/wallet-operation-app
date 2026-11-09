import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/navigation/tab-bar';
import { useSession } from '@/features/auth/session';
import { colors } from '@/theme';

export default function TabsLayout() {
  const session = useSession();
  if (!session) return <Redirect href="/login" />;

  return (
    <Tabs
      tabBar={props => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bgApp } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="statistics" />
      <Tabs.Screen name="add" />
      <Tabs.Screen name="wallets" />
      <Tabs.Screen name="operations" />
      <Tabs.Screen name="add-operation" />
      <Tabs.Screen name="add-wallet" />
    </Tabs>
  );
}
