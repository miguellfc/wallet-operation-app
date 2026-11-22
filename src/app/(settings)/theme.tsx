import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/settings/back-header';
import { BrandGradient } from '@/components/ui/brand-gradient';
import { ScreenBackground } from '@/components/ui/screen-background';
import { setTheme, useThemeName } from '@/features/theme/theme-store';
import { colors, layout, radius, spacing, themedStyles, themePalette, typography, type ThemeName } from '@/theme';

const GLOWS = [
  { left: '84%', top: '18%' },
  { left: '8%', top: '48%' },
  { left: '80%', top: '76%' },
] as const;

const OPTIONS: { value: ThemeName; title: string; detail: string }[] = [
  { value: 'light', title: 'Claro', detail: 'Fondo claro y texto oscuro' },
  { value: 'dark', title: 'Oscuro', detail: 'Fondo oscuro y texto claro' },
];

function ThemePreview({ name }: { name: ThemeName }) {
  const palette = themePalette(name);
  return (
    <View style={[styles.preview, { backgroundColor: palette.bgApp, borderColor: palette.divider }]}>
      <View style={styles.previewHero}>
        <BrandGradient radius={6} x1={0.05} y1={0.62} x2={0.95} y2={0.38} />
      </View>
      <View style={styles.previewRow}>
        <View style={[styles.previewTile, { backgroundColor: palette.surface }]} />
        <View style={[styles.previewTile, { backgroundColor: palette.surface }]} />
      </View>
      <View style={[styles.previewLine, { backgroundColor: palette.surface }]}>
        <View style={[styles.previewDot, { backgroundColor: palette.income }]} />
        <View style={[styles.previewText, { backgroundColor: palette.textMuted }]} />
      </View>
      <View style={[styles.previewLine, { backgroundColor: palette.surface }]}>
        <View style={[styles.previewDot, { backgroundColor: palette.expense }]} />
        <View style={[styles.previewText, { backgroundColor: palette.textMuted }]} />
      </View>
    </View>
  );
}

export default function ThemeScreen() {
  const insets = useSafeAreaInsets();
  const active = useThemeName();

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + spacing.xxl }]}>
        <BackHeader title="Tema" />
        <View style={styles.list} accessibilityRole="radiogroup">
          {OPTIONS.map(option => {
            const selected = option.value === active;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={`${option.title}. ${option.detail}`}
                accessibilityState={{ checked: selected }}
                onPress={() => setTheme(option.value)}
                style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.pressed]}>
                <ThemePreview name={option.value} />
                <View style={styles.choice}>
                  <View style={[styles.radio, selected && styles.radioSelected]} />
                  <View style={styles.choiceText}>
                    <Text style={styles.title}>{option.title}</Text>
                    <Text style={styles.detail}>{option.detail}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.note}>Se aplica al momento y se guarda en este dispositivo.</Text>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = themedStyles(() => ({
  content: {
    paddingHorizontal: spacing.xl,
    gap: 15,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  list: { gap: 12 },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  cardSelected: { borderColor: colors.brand },
  pressed: { opacity: 0.85 },
  preview: { height: 132, borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  previewHero: { height: 34, borderRadius: 6, overflow: 'hidden' },
  previewRow: { flexDirection: 'row', gap: spacing.sm },
  previewTile: { flex: 1, height: 20, borderRadius: 6 },
  previewLine: { height: 18, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6 },
  previewDot: { width: 8, height: 8, borderRadius: radius.full },
  previewText: { width: '45%', height: 4, borderRadius: 2, opacity: 0.6 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  radio: { width: 22, height: 22, borderRadius: radius.full, borderWidth: 2, borderColor: colors.textMuted },
  radioSelected: { borderWidth: 7, borderColor: colors.brand },
  choiceText: { flex: 1, gap: 2 },
  title: { ...typography.bodyMedium, fontFamily: typography.titleSection.fontFamily, fontSize: 16, color: colors.textPrimary },
  detail: { ...typography.caption, fontSize: 12, lineHeight: 16, color: colors.textMuted },
  note: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
}));
