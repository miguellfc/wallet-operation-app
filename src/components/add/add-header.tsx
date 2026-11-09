import { StyleSheet, Text, View } from 'react-native';

import { HomeHeader } from '@/components/home/home-header';
import { confirmSignOut } from '@/features/auth/sign-out';
import { loadProfile } from '@/features/wallets/wallets-api';
import { useApiData } from '@/lib/use-api-data';
import { colors, typography } from '@/theme';

export function AddHeader({ title }: { title: string }) {
  const { data: profile } = useApiData(loadProfile);

  return (
    <View style={styles.header}>
      <HomeHeader name={profile?.firstName ?? ''} onProfilePress={confirmSignOut} />
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 17 },
  title: { ...typography.titleSection, color: colors.textPrimary },
});
