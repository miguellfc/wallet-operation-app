import { Pressable, Text, View } from 'react-native';

import { CategoryIcon } from '@/components/ui/category-icon';
import { colors, radius, spacing, themedStyles, typography } from '@/theme';

type InfoRowProps = {
  icon: string;
  iconColor: string;
  iconBackground: string;
  title: string;
  detail: string;
  amount: string;
  caption?: string;
  accessibilityLabel: string;
  onPress?: () => void;
};

export function InfoRow({
  icon,
  iconColor,
  iconBackground,
  title,
  detail,
  amount,
  caption,
  accessibilityLabel,
  onPress,
}: InfoRowProps) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.iconBox, { backgroundColor: iconBackground }]}>
        <CategoryIcon name={icon} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.detail} numberOfLines={2}>
          {detail}
        </Text>
      </View>
      <View style={styles.side}>
        <Text style={styles.amount} numberOfLines={1}>
          {amount}
        </Text>
        {caption && <Text style={styles.detail}>{caption}</Text>}
      </View>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  row: {
    minHeight: 76,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: { opacity: 0.85 },
  iconBox: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 2 },
  title: { ...typography.bodyMedium, color: colors.textPrimary },
  detail: { ...typography.caption, color: colors.textMuted },
  side: { alignItems: 'flex-end', gap: 2, maxWidth: '45%' },
  amount: { ...typography.bodyMedium, fontFamily: typography.titleSection.fontFamily, color: colors.textPrimary },
}));
