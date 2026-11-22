import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { BalanceCard } from '@/components/home/balance-card';
import { TabScroll } from '@/components/wallets/tab-scroll';
import { WalletCard } from '@/components/wallets/wallet-card';
import { loadWallets, type WalletSummary } from '@/features/wallets/wallets-api';
import { formatAmount, formatNumber } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, spacing, themedStyles, typography } from '@/theme';

const GRID_GAP = 15;

const openWallet = (id: string) =>
  router.navigate({ pathname: '/wallet-detail', params: { id, at: String(Date.now()) } } as Href);

function pairs(wallets: WalletSummary[]) {
  const rows: WalletSummary[][] = [];
  for (let index = 0; index < wallets.length; index += 2) rows.push(wallets.slice(index, index + 2));
  return rows;
}

export function WalletsView({ header }: { header: ReactNode }) {
  const { data, error, retry, refresh, refreshing } = useApiData(loadWallets);

  return (
    <TabScroll
      header={header}
      loading={!data}
      error={error}
      empty={data && data.wallets.length === 0 ? 'Aún no tienes billeteras' : undefined}
      refreshing={refreshing}
      onRefresh={refresh}
      onRetry={retry}>
      {data && (
        <>
          <BalanceCard amount={formatAmount(data.balance, data.currencyCode)} />
          <View style={styles.section}>
            <Text style={styles.title} accessibilityRole="header">
              Tus cuentas activas
            </Text>
            {pairs(data.wallets).map(row => (
              <View key={row[0].id} style={styles.row}>
                {row.map(wallet => (
                  <WalletCard
                    key={wallet.id}
                    name={wallet.name}
                    amount={formatNumber(wallet.balance)}
                    currencyCode={wallet.currencyCode}
                    excluded={wallet.excluded}
                    icon={wallet.icon}
                    color={wallet.color}
                    onPress={() => openWallet(wallet.id)}
                  />
                ))}
                {row.length === 1 && <View style={styles.spacer} />}
              </View>
            ))}
          </View>
        </>
      )}
    </TabScroll>
  );
}

const styles = themedStyles(() => ({
  section: { gap: GRID_GAP },
  title: { ...typography.titleSection, fontFamily: typography.bodyMedium.fontFamily, color: colors.textPrimary, marginBottom: -spacing.xs },
  row: { flexDirection: 'row', gap: GRID_GAP },
  spacer: { flex: 1 },
}));
