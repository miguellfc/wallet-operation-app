import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeHeader } from '@/components/home/home-header';
import { ScreenBackground } from '@/components/ui/screen-background';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { DebtsView } from '@/components/wallets/debts-view';
import { RecurrencesView } from '@/components/wallets/recurrences-view';
import { WalletsView } from '@/components/wallets/wallets-view';
import { loadProfile } from '@/features/wallets/wallets-api';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, spacing, themedStyles } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';

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
  useThemeName();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ section?: string; at?: string }>();
  const [section, setSection] = useState<Section>('WALLETS');
  const [opened, setOpened] = useState<string>();

  const request = `${params.section}:${params.at}`;
  const requested = SECTIONS.find(item => item.value === params.section)?.value;
  if (requested && request !== opened) {
    setOpened(request);
    setSection(requested);
  }
  const { data: profile } = useApiData(loadProfile);

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
      <HomeHeader name={profile?.firstName ?? ''} />
      <SegmentedControl
        options={SECTIONS}
        value={section}
        onChange={setSection}
        activeColor={colors.brand}
        compact
      />
    </View>
  );

  return (
    <ScreenBackground glows={[...GLOWS]}>
      {header}
      <View style={styles.body}>
        {section === 'WALLETS' && <WalletsView />}
        {section === 'DEBTS' && <DebtsView />}
        {section === 'RECURRENCES' && <RecurrencesView />}
      </View>
    </ScreenBackground>
  );
}

const styles = themedStyles(() => ({
  header: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  body: { flex: 1 },
}));
