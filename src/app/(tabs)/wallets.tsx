import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HomeHeader } from '@/components/home/home-header';
import { ScreenBackground } from '@/components/ui/screen-background';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { DebtsView } from '@/components/wallets/debts-view';
import { RecurrencesView } from '@/components/wallets/recurrences-view';
import { WalletsView } from '@/components/wallets/wallets-view';
import { confirmSignOut } from '@/features/auth/sign-out';
import { loadProfile } from '@/features/wallets/wallets-api';
import { useApiData } from '@/lib/use-api-data';
import { colors, spacing } from '@/theme';

type Section = 'WALLETS' | 'DEBTS' | 'RECURRENCES';

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'WALLETS', label: 'Billeteras' },
  { value: 'DEBTS', label: 'Deudas' },
  { value: 'RECURRENCES', label: 'Recurrentes' },
];

const GLOWS = [
  { left: '82%', top: '30%' },
  { left: '8%', top: '62%' },
  { left: '94%', top: '82%' },
] as const;

export default function WalletsScreen() {
  const [section, setSection] = useState<Section>('WALLETS');
  const { data: profile } = useApiData(loadProfile);

  const header = (
    <View style={styles.header}>
      <HomeHeader name={profile?.firstName ?? ''} onProfilePress={confirmSignOut} />
      <SegmentedControl options={SECTIONS} value={section} onChange={setSection} activeColor={colors.brand} compact />
    </View>
  );

  return (
    <ScreenBackground glows={[...GLOWS]}>
      {section === 'WALLETS' && <WalletsView header={header} />}
      {section === 'DEBTS' && <DebtsView header={header} />}
      {section === 'RECURRENCES' && <RecurrencesView header={header} />}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.lg },
});
