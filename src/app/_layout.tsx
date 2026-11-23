import {
  Montserrat_300Light,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_800ExtraBold,
  Montserrat_900Black,
  useFonts,
} from '@expo-google-fonts/montserrat';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { ConfirmDialogHost } from '@/components/ui/confirm-dialog';
import { restoreLocalProfile } from '@/features/auth/local-profile';
import { restoreSession } from '@/features/auth/session';
import { isLocal } from '@/lib/data-source';
import { colors, fonts } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';

SplashScreen.preventAutoHideAsync();

const restore = isLocal ? restoreLocalProfile : restoreSession;

export default function RootLayout() {
  const themeName = useThemeName();
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

  if (!ready) return null;

  return (
    <>
      <StatusBar style={themeName === 'light' ? 'dark' : 'light'} />
      <Stack key={themeName} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgApp } }} />
      <ConfirmDialogHost key={`dialog-${themeName}`} />
    </>
  );
}
