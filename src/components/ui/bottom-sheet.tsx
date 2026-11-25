import type { PropsWithChildren } from 'react';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetModal } from '@/components/ui/sheet-modal';
import { colors, layout, radius, spacing, themedStyles, typography } from '@/theme';

type BottomSheetProps = PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>;

export function BottomSheet({ visible, title, onClose, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <SheetModal visible={visible} onClose={onClose} style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {children}
    </SheetModal>
  );
}

const styles = themedStyles(() => ({
  sheet: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    backgroundColor: colors.bgApp,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  title: { ...typography.titleSection, color: colors.textPrimary },
}));
