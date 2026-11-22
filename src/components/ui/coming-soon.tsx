import { Text, View } from 'react-native';

import { ScreenBackground } from '@/components/ui/screen-background';
import { colors, spacing, themedStyles, typography } from '@/theme';

export function ComingSoon({ title }: { title: string }) {
  return (
    <ScreenBackground glows={[{ left: '82%', top: '30%' }, { left: '8%', top: '70%' }]}>
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.text}>Próximamente</Text>
      </View>
    </ScreenBackground>
  );
}

const styles = themedStyles(() => ({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  title: { ...typography.titleSection, color: colors.textPrimary },
  text: { ...typography.bodyMedium, color: colors.textSecondary },
}));
