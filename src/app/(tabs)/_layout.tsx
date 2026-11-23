import { Redirect } from 'expo-router';
import { TransitionPresets, Tabs, type TabsScreenOptions } from 'expo-router/js-tabs';
import { Easing } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { TabBar } from '@/components/navigation/tab-bar';
import { signInHref, useSignedIn } from '@/features/auth/sign-in-guard';
import { colors } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';

const RISE: TabsScreenOptions = {
  animation: 'fade',
  transitionSpec: { animation: 'timing', config: { duration: 220, easing: Easing.bezier(0.23, 1, 0.32, 1) } },
  sceneStyleInterpolator: ({ current }) => ({
    sceneStyle: {
      opacity: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
      transform: [{ translateY: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [12, 0, 12] }) }],
    },
  }),
};

export default function TabsLayout() {
  useThemeName();
  const signedIn = useSignedIn();
  const reduced = useReducedMotion();
  if (!signedIn) return <Redirect href={signInHref} />;

  return (
    <Tabs
      tabBar={props => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bgApp },
        ...(reduced ? TransitionPresets.FadeTransition : RISE),
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="statistics" />
      <Tabs.Screen name="add" />
      <Tabs.Screen name="wallets" />
      <Tabs.Screen name="operations" />
    </Tabs>
  );
}
