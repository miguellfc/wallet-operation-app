import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { BackHeader } from '@/components/settings/back-header';
import { Button } from '@/components/ui/button';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Bone, Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { Stagger } from '@/components/ui/stagger';
import { RevealScrollView } from '@/components/ui/scroll-reveal';
import {
  currentVersion,
  fetchLatestRelease,
  formatSize,
  installRelease,
  isNewerVersion,
  updateErrorMessage,
  type Release,
} from '@/features/update/update-api';
import { useThemeName } from '@/features/theme/theme-store';
import { isLocal } from '@/lib/data-source';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, radius, spacing, themedStyles, typography } from '@/theme';

const GLOWS = [
  { left: '84%', top: '18%' },
  { left: '8%', top: '48%' },
  { left: '80%', top: '76%' },
] as const;

const UPDATE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4"/><path d="M12 8v5l3 2"/></g></svg>';

const isAndroid = process.env.EXPO_OS === 'android';

const loadLatestRelease = async () => ({ release: await fetchLatestRelease() });

function ReleaseSkeleton() {
  return (
    <Skeleton>
      <SkeletonCard style={styles.skeletonCard}>
        <Bone width={160} height={16} />
        <Bone width="80%" height={12} />
        <Bone height={50} round={radius.full} />
      </SkeletonCard>
    </Skeleton>
  );
}

function AvailableRelease({ release }: { release: Release }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const install = async () => {
    setError(null);
    setProgress(0);
    try {
      await installRelease(release, setProgress);
    } catch (reason) {
      setError(updateErrorMessage(reason));
    } finally {
      setProgress(null);
    }
  };

  const busy = progress !== null;
  const percent = Math.round((progress ?? 0) * 100);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Versión {release.version} disponible</Text>
      {release.apkUrl ? (
        <>
          {release.notes.length > 0 && <Text style={styles.notes}>{release.notes}</Text>}
          {release.size > 0 && <Text style={styles.caption}>Tamaño: {formatSize(release.size)}</Text>}
          <Button label={isAndroid ? 'Descargar e instalar' : 'Descargar APK'} loading={busy} onPress={install} />
          {busy && (
            <Text style={styles.caption} accessibilityLiveRegion="polite">
              Descargando… {percent} %
            </Text>
          )}
          {error && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}
        </>
      ) : (
        <Text style={styles.caption}>Esta versión todavía no incluye el APK para esta app.</Text>
      )}
    </View>
  );
}

function ReleaseStatus() {
  const { data, error, retry, refresh, refreshing } = useApiData(loadLatestRelease);

  if (error && data === null) {
    return (
      <View style={styles.card}>
        <Text style={styles.error}>No se pudo comprobar si hay una versión nueva.</Text>
        <Button label="Reintentar" variant="outline" onPress={retry} />
      </View>
    );
  }
  if (data === null) return <ReleaseSkeleton />;
  const { release } = data;
  if (release && isNewerVersion(release.version)) return <AvailableRelease release={release} />;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Tienes la última versión</Text>
      <Text style={styles.caption}>No hay ninguna versión más reciente publicada.</Text>
      <Button label="Buscar de nuevo" variant="outline" loading={refreshing} onPress={refresh} />
    </View>
  );
}

export default function UpdateScreen() {
  useThemeName();
  const insets = useSafeAreaInsets();

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <RevealScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + spacing.xxl }]}>
        <Stagger>
          <BackHeader title="Actualización" />
          <View style={styles.versionCard} accessible accessibilityLabel={`Versión actual ${currentVersion}`}>
            <View style={styles.iconCircle}>
              <SvgXml xml={UPDATE_ICON} color={colors.textInverse} width={28} height={28} />
            </View>
            <View style={styles.versionText}>
              <Text style={styles.caption}>Versión actual</Text>
              <Text style={styles.version}>{currentVersion}</Text>
              <Text style={styles.caption}>{isLocal ? 'Datos en este dispositivo' : 'Cuenta en línea'}</Text>
            </View>
          </View>
          <ReleaseStatus />
        </Stagger>
      </RevealScrollView>
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
  versionCard: {
    minHeight: 87,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 17,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: radius.full,
    backgroundColor: colors.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionText: { flex: 1, gap: 2 },
  version: {
    ...typography.bodyMedium,
    fontFamily: typography.titleSection.fontFamily,
    fontSize: 22,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  skeletonCard: { gap: spacing.md },
  cardTitle: {
    ...typography.bodyMedium,
    fontFamily: typography.titleSection.fontFamily,
    fontSize: 16,
    color: colors.textPrimary,
  },
  notes: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary },
  caption: { ...typography.caption, fontSize: 12, lineHeight: 16, color: colors.textMuted },
  error: { ...typography.bodyMedium, color: colors.error },
}));
