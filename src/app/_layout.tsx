import {
  Montserrat_300Light,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_800ExtraBold,
  Montserrat_900Black,
  useFonts,
} from '@expo-google-fonts/montserrat';
import { Stack } from 'expo-router/js-stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useReducedMotion } from 'react-native-reanimated';

import { AppLock } from '@/components/lock/app-lock';
import { ConfirmDialogHost } from '@/components/ui/confirm-dialog';
import { restoreLocalProfile } from '@/features/auth/local-profile';
import { restoreSession } from '@/features/auth/session';
import { restoreLock, watchAppState } from '@/features/lock/lock-store';
import { isLocal } from '@/lib/data-source';
import { runDueRecurrences } from '@/lib/local-db/recurrences';
import { colors, fonts } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';
import { useSwipeBack } from '@/lib/navigation';

SplashScreen.preventAutoHideAsync();

const restoreLocal = async () => {
  const profile = await restoreLocalProfile();
  await restoreLock(profile !== null);
  if (profile) await runDueRecurrences().catch(() => 0);
};

const watchRecurrences = () => {
  const subscription = AppState.addEventListener('change', state => {
    if (state === 'active') runDueRecurrences().catch(() => 0);
  });
  return () => subscription.remove();
};

const restore = isLocal ? restoreLocal : restoreSession;

export default function RootLayout() {
  const themeName = useThemeName();
  const reduced = useReducedMotion();
  const swipeBack = useSwipeBack();
  const [fontsLoaded] = useFonts({
    Montserrat_300Light,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_800ExtraBold,
    Montserrat_900Black,
    [fonts.displayBold]: require('@/assets/fonts/ClashDisplay-Bold.ttf'),
  });
  const [sessionRestored, setSessionRestored] = useState(false);
  const ready = fontsLoaded && sessionRestored;

  useEffect(() => {
    restore()
      .catch(() => null)
      .finally(() => setSessionRestored(true));
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => (isLocal ? watchAppState() : undefined), []);

  useEffect(() => (isLocal ? watchRecurrences() : undefined), []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bgApp }}>
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
        <StatusBar style={themeName === 'light' ? 'dark' : 'light'} />
        <Stack
          key={themeName}
          screenOptions={{
            headerShown: false,
            animation: reduced ? 'fade' : 'default',
            cardStyle: { flex: 1, backgroundColor: colors.bgApp },
          }}>
          <Stack.Screen name="(settings)" options={swipeBack} />
          <Stack.Screen name="(details)" options={swipeBack} />
        </Stack>
        {isLocal && <AppLock key={`lock-${themeName}`} />}
        <ConfirmDialogHost key={`dialog-${themeName}`} />
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
