import { Redirect, type Href } from 'expo-router';
import { TransitionPresets, Tabs, type TabsScreenOptions } from 'expo-router/js-tabs';
import { Easing, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { TabBar } from '@/components/navigation/tab-bar';
import { signInHref, useSignedIn } from '@/features/auth/sign-in-guard';
import { useWalletSetup } from '@/features/wallets/wallet-setup';
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
  const setup = useWalletSetup(signedIn);
  const reduced = useReducedMotion();
  if (!signedIn) return <Redirect href={signInHref} />;
  if (setup === 'checking') return <View style={{ flex: 1, backgroundColor: colors.bgApp }} />;
  if (setup === 'needed') return <Redirect href={'/wallet-setup' as Href} />;

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
