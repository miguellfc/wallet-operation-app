import { Redirect, Stack } from 'expo-router';

import { signInHref, useSignedIn } from '@/features/auth/sign-in-guard';
import { colors } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';

export default function SettingsLayout() {
  useThemeName();
  const signedIn = useSignedIn();
  if (!signedIn) return <Redirect href={signInHref} />;

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgApp } }} />;
}
