import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { BackHeader } from '@/components/settings/back-header';
import { showConfirm } from '@/components/ui/confirm-dialog';
import { ScreenBackground } from '@/components/ui/screen-background';
import { backupErrorMessage, exportData, importData, pickBackup } from '@/features/backup/backup-api';
import { useThemeName } from '@/features/theme/theme-store';
import { colors, layout, radius, spacing, themedStyles, typography } from '@/theme';

const GLOWS = [
  { left: '84%', top: '18%' },
  { left: '8%', top: '48%' },
  { left: '80%', top: '76%' },
] as const;

const EXPORT_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M3 15c0 2.83 0 4.24.88 5.12C4.76 21 6.17 21 9 21h6c2.83 0 4.24 0 5.12-.88C21 19.24 21 17.83 21 15"/><path d="M12 16V3M8 7.38L12 3l4 4.38"/></g></svg>';

const IMPORT_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M3 15c0 2.83 0 4.24.88 5.12C4.76 21 6.17 21 9 21h6c2.83 0 4.24 0 5.12-.88C21 19.24 21 17.83 21 15"/><path d="M12 3v13m-4-4.38L12 16l4-4.38"/></g></svg>';

type Busy = 'export' | 'import' | null;

type ActionCardProps = {
  icon: string;
  title: string;
  detail: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
};

function ActionCard({ icon, title, detail, busy, disabled, onPress }: ActionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.card, disabled && !busy && styles.disabled, pressed && styles.pressed]}>
      <View style={styles.iconCircle}>
        {busy ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <SvgXml xml={icon} color={colors.textInverse} width={28} height={28} />
        )}
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDetail}>{detail}</Text>
      </View>
    </Pressable>
  );
}

export default function BackupScreen() {
  useThemeName();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<Busy>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: Exclude<Busy, null>, task: () => Promise<string | null>) => {
    setBusy(kind);
    setError(null);
    setNotice(null);
    try {
      setNotice(await task());
    } catch (reason) {
      setError(backupErrorMessage(reason));
    } finally {
      setBusy(null);
    }
  };

  const exportBackup = () =>
    run('export', async () => {
      await exportData();
      return 'Copia de seguridad creada.';
    });

  const confirmImport = (content: string) =>
    showConfirm({
      title: 'Importar copia',
      message:
        'Se reemplazarán todos los datos de este dispositivo por los del archivo. Esta acción no se puede deshacer.',
      confirmLabel: 'Importar',
      onConfirm: () =>
        run('import', async () => {
          await importData(content);
          return 'Datos importados.';
        }),
    });

  const importBackup = () =>
    run('import', async () => {
      const content = await pickBackup();
      if (content !== null) confirmImport(content);
      return null;
    });

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + spacing.xxl }]}>
        <BackHeader title="Copia de seguridad" />
        <Text style={styles.intro}>
          Tus datos solo están en este dispositivo. Exporta una copia de vez en cuando y guárdala en un lugar seguro.
        </Text>
        <View style={styles.list}>
          <ActionCard
            icon={EXPORT_ICON}
            title="Exportar"
            detail="Crea un archivo JSON con todos tus datos"
            busy={busy === 'export'}
            disabled={busy !== null}
            onPress={exportBackup}
          />
          <ActionCard
            icon={IMPORT_ICON}
            title="Importar"
            detail="Reemplaza tus datos por los de una copia"
            busy={busy === 'import'}
            disabled={busy !== null}
            onPress={importBackup}
          />
        </View>
        {notice && (
          <Text style={styles.notice} accessibilityLiveRegion="polite">
            {notice}
          </Text>
        )}
        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
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
  intro: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary },
  list: { gap: 12 },
  card: {
    minHeight: 87,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 17,
  },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.85 },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: radius.full,
    backgroundColor: colors.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, gap: 4 },
  cardTitle: {
    ...typography.bodyMedium,
    fontFamily: typography.titleSection.fontFamily,
    fontSize: 16,
    color: colors.textPrimary,
  },
  cardDetail: { ...typography.caption, fontSize: 12, lineHeight: 16, color: colors.textMuted },
  notice: { ...typography.bodyMedium, color: colors.textAccent, textAlign: 'center' },
  error: { ...typography.bodyMedium, color: colors.error, textAlign: 'center' },
}));
