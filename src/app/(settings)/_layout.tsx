import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/features/auth/session';
import { colors } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';

export default function SettingsLayout() {
  useThemeName();
  const session = useSession();
  if (!session) return <Redirect href="/login" />;

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgApp } }} />;
}
