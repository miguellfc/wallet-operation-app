import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { colors, layout, spacing, typography } from '@/theme';

type TabScrollProps = PropsWithChildren<{
  header: ReactNode;
  loading: boolean;
  error: unknown;
  empty?: string;
  refreshing: boolean;
  onRefresh: () => void;
  onRetry: () => void;
}>;

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  return 'El servidor no pudo cargar estos datos. Vuelve a intentarlo en un momento.';
}

export function TabScroll({ header, loading, error, empty, refreshing, onRefresh, onRetry, children }: TabScrollProps) {
  const insets = useSafeAreaInsets();
  let body = children;
  if (error && loading) {
    body = (
      <View style={styles.state}>
        <Text style={styles.stateText} accessibilityLiveRegion="polite">
          {loadErrorMessage(error)}
        </Text>
        <Button label="Reintentar" onPress={onRetry} />
      </View>
    );
  } else if (loading) {
    body = (
      <View style={styles.state}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  } else if (empty) {
    body = <Text style={[styles.stateText, styles.empty]}>{empty}</Text>;
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.brand}
          colors={[colors.brand]}
          progressBackgroundColor={colors.bgApp}
        />
      }>
      {header}
      {body}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  state: { paddingVertical: spacing.xxl, gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
  empty: { paddingVertical: spacing.xxl },
});
