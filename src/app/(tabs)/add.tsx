import { router, type Href } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddOption } from '@/components/add/add-option';
import { HomeHeader } from '@/components/home/home-header';
import { ScreenBackground } from '@/components/ui/screen-background';
import { confirmSignOut } from '@/features/auth/sign-out';
import { loadProfile } from '@/features/wallets/wallets-api';
import { useApiData } from '@/lib/use-api-data';
import { layout, spacing } from '@/theme';

const GLOWS = [
  { left: '27%', top: '16%' },
  { left: '34%', top: '41%' },
  { left: '78%', top: '32%' },
] as const;

const openOperationForm = () => router.navigate('/add-operation' as Href);

const openWalletForm = () => router.navigate('/add-wallet' as Href);

const OPTIONS = [
  {
    label: 'Operaciones',
    icon: require('@/assets/icons/add-operation.svg'),
    width: 18,
    height: 19,
    onPress: openOperationForm,
  },
  {
    label: 'Billeteras',
    icon: require('@/assets/icons/add-wallet.svg'),
    width: 27,
    height: 27,
    onPress: openWalletForm,
  },
  { label: 'Deudas', icon: require('@/assets/icons/add-debt.svg'), width: 24, height: 24 },
  { label: 'Recurrentes', icon: require('@/assets/icons/add-recurrence.svg'), width: 24, height: 24 },
];

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const { data: profile } = useApiData(loadProfile);

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}>
        <HomeHeader name={profile?.firstName ?? ''} onProfilePress={confirmSignOut} />
        <View style={styles.list}>
          {OPTIONS.map(option => (
            <AddOption
              key={option.label}
              label={option.label}
              icon={option.icon}
              iconWidth={option.width}
              iconHeight={option.height}
              onPress={'onPress' in option ? option.onPress : undefined}
            />
          ))}
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: 24,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  list: { gap: 12 },
});
