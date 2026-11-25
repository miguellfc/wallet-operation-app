import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeHeader } from '@/components/home/home-header';
import { loadProfile } from '@/features/wallets/wallets-api';
import { useApiData } from '@/lib/use-api-data';
import { layout, spacing, themedStyles } from '@/theme';

export function StickyHeader({ children }: { children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { data: profile } = useApiData(loadProfile);

  return (
    <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
      <HomeHeader name={profile?.firstName ?? ''} />
      {children}
    </View>
  );
}

const styles = themedStyles(() => ({
  header: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
}));
