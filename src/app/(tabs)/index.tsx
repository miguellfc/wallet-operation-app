import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalanceCard } from '@/components/home/balance-card';
import { CashFlowChart } from '@/components/home/cash-flow-chart';
import { CategoryBreakdown } from '@/components/home/category-breakdown';
import { HomeHeader } from '@/components/home/home-header';
import { Button } from '@/components/ui/button';
import { ScreenBackground } from '@/components/ui/screen-background';
import { SummaryCard } from '@/components/ui/summary-card';
import { confirmSignOut } from '@/features/auth/sign-out';
import { loadHome, type CategoryTotal } from '@/features/home/home-api';
import { formatAmount } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, spacing, typography } from '@/theme';

const GLOWS = [
  { left: '82%', top: '32%' },
  { left: '8%', top: '80%' },
  { left: '94%', top: '62%' },
] as const;

const totalOf = (categories: CategoryTotal[], type: CategoryTotal['type']) =>
  categories.filter(item => item.type === type).reduce((sum, item) => sum + item.total, 0);

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  return 'El servidor no pudo cargar tus datos. Vuelve a intentarlo en un momento.';
}


export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { data, error, retry, refresh, refreshing } = useApiData(loadHome);

  if (!data) {
    return (
      <ScreenBackground glows={[...GLOWS]}>
        <View style={styles.state}>
          {error ? (
            <>
              <Text style={styles.stateText} accessibilityLiveRegion="polite">
                {loadErrorMessage(error)}
              </Text>
              <Button label="Reintentar" onPress={retry} />
            </>
          ) : (
            <ActivityIndicator color={colors.brand} />
          )}
        </View>
      </ScreenBackground>
    );
  }

  const code = data.currency.code;

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
            progressBackgroundColor={colors.bgApp}
          />
        }>
        <HomeHeader name={data.firstName} onProfilePress={confirmSignOut} />
        <View style={styles.body}>
          <BalanceCard amount={formatAmount(data.balance, code)} />
          <View style={styles.totals}>
            <SummaryCard kind="INCOME" label="Ingresos" amount={formatAmount(totalOf(data.categories, 'INCOME'), code)} />
            <SummaryCard kind="EXPENSE" label="Gastos" amount={formatAmount(totalOf(data.categories, 'EXPENSE'), code)} />
          </View>
          <CashFlowChart periods={data.cashFlow} currencyCode={code} />
          <CategoryBreakdown categories={data.categories} currencyCode={code} />
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: 29,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  body: { gap: 19 },
  totals: { flexDirection: 'row', gap: 21 },
  state: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
});
