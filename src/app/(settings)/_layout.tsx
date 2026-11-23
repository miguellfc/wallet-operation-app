import { Redirect } from 'expo-router';
import { Stack } from 'expo-router/js-stack';

import { signInHref, useSignedIn } from '@/features/auth/sign-in-guard';
import { useSwipeBack } from '@/lib/navigation';
import { colors } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';

export default function SettingsLayout() {
  useThemeName();
  const swipeBack = useSwipeBack();
  const signedIn = useSignedIn();
  if (!signedIn) return <Redirect href={signInHref} />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...swipeBack,
        cardStyle: { flex: 1, backgroundColor: colors.bgApp },
      }}
    />
  );
}
