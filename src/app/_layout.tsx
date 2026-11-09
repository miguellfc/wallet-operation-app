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

import { restoreSession } from '@/features/auth/session';
import { colors, fonts } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
    restoreSession()
      .catch(() => null)
      .finally(() => setSessionRestored(true));
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgApp } }} />
    </>
  );
}
