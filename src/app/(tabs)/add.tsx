import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { AddOption } from '@/components/add/add-option';
import { StickyHeader } from '@/components/home/sticky-header';
import { Reveal } from '@/components/ui/reveal';
import { ScreenBackground } from '@/components/ui/screen-background';
import { RevealScrollView } from '@/components/ui/scroll-reveal';
import { layout, spacing, themedStyles } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';

const GLOWS = [
  { left: '27%', top: '16%' },
  { left: '34%', top: '41%' },
  { left: '78%', top: '32%' },
] as const;

const openOperationForm = () =>
  router.navigate({ pathname: '/add-operation', params: { at: String(Date.now()) } } as Href);

const openWalletForm = () =>
  router.navigate({ pathname: '/add-wallet', params: { at: String(Date.now()) } } as Href);

const openDebtForm = () =>
  router.navigate({ pathname: '/add-debt', params: { at: String(Date.now()) } } as Href);

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
  {
    label: 'Deudas',
    icon: require('@/assets/icons/add-debt.svg'),
    width: 24,
    height: 24,
    onPress: openDebtForm,
  },
];

export default function AddScreen() {
  useThemeName();

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <StickyHeader />
      <RevealScrollView contentContainerStyle={[styles.content, styles.contentTop]}>
        <View style={styles.list}>
          {OPTIONS.map((option, index) => (
            <Reveal key={option.label} index={index}>
              <AddOption
                label={option.label}
                icon={option.icon}
                iconWidth={option.width}
                iconHeight={option.height}
                onPress={option.onPress}
              />
            </Reveal>
          ))}
        </View>
      </RevealScrollView>
    </ScreenBackground>
  );
}

const styles = themedStyles(() => ({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: 24,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  contentTop: { paddingTop: spacing.sm },
  list: { gap: 12 },
}));
