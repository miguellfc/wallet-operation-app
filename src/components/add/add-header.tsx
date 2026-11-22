import { Text, View } from 'react-native';

import { HomeHeader } from '@/components/home/home-header';
import { loadProfile } from '@/features/wallets/wallets-api';
import { useApiData } from '@/lib/use-api-data';
import { colors, themedStyles, typography } from '@/theme';

export function AddHeader({ title }: { title: string }) {
  const { data: profile } = useApiData(loadProfile);

  return (
    <View style={styles.header}>
      <HomeHeader name={profile?.firstName ?? ''} />
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  header: { gap: 17 },
  title: { ...typography.titleSection, color: colors.textPrimary },
}));
