import { Redirect, router, type Href } from 'expo-router';
import { Text, View } from 'react-native';

import { AuthLayout } from '@/components/ui/auth-layout';
import { Button } from '@/components/ui/button';
import { WalletCard } from '@/components/wallets/wallet-card';
import { signInHref, useSignedIn } from '@/features/auth/sign-in-guard';
import { loadWallets, type WalletSummary } from '@/features/wallets/wallets-api';
import { formatNumber } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, spacing, themedStyles, typography } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';

const GRID_GAP = 15;

const pairs = (wallets: WalletSummary[]) => {
  const rows: WalletSummary[][] = [];
  for (let index = 0; index < wallets.length; index += 2) rows.push(wallets.slice(index, index + 2));
  return rows;
};

const addWallet = () => router.push({ pathname: '/add-wallet', params: { setup: '1' } } as Href);

const finish = () => router.replace('/' as Href);

export default function WalletSetupScreen() {
  useThemeName();
  const signedIn = useSignedIn();
  const { data, error, retry } = useApiData(loadWallets);

  if (!signedIn) return <Redirect href={signInHref} />;

  const wallets = data?.wallets ?? [];
  const ready = wallets.length > 0;

  return (
    <AuthLayout title={'Crea tus\nbilleteras'}>
      <View style={styles.content}>
        <Text style={styles.intro}>
          Añade las billeteras donde guardas tu dinero, como efectivo, tu cuenta del banco o una tarjeta. Cada una
          puede tener su propia moneda y saldo inicial.
        </Text>
        {error && !data ? (
          <View style={styles.state}>
            <Text style={styles.error} accessibilityLiveRegion="polite">
              No se pudieron cargar tus billeteras. Revisa tu conexión y vuelve a intentarlo.
            </Text>
            <Button label="Reintentar" variant="outline" onPress={retry} />
          </View>
        ) : (
          ready && (
            <View style={styles.grid}>
              {pairs(wallets).map(row => (
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
                    />
                  ))}
                  {row.length === 1 && <View style={styles.spacer} />}
                </View>
              ))}
            </View>
          )
        )}
        <Text style={styles.hint} accessibilityLiveRegion="polite">
          {ready
            ? 'Puedes añadir más ahora o más tarde desde la pestaña Billeteras.'
            : 'Necesitas al menos una billetera para empezar.'}
        </Text>
      </View>
      <View style={styles.actions}>
        <Button
          label={ready ? 'Añadir otra billetera' : 'Añadir billetera'}
          variant={ready ? 'outline' : 'primary'}
          onPress={addWallet}
        />
        {ready && <Button label="Empezar" onPress={finish} />}
      </View>
    </AuthLayout>
  );
}

const styles = themedStyles(() => ({
  content: { gap: 18, marginBottom: 22 },
  intro: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
  grid: { gap: GRID_GAP },
  row: { flexDirection: 'row', gap: GRID_GAP },
  spacer: { flex: 1 },
  hint: { ...typography.bodyMedium, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  state: { gap: spacing.lg },
  error: { ...typography.bodyMedium, color: colors.error, textAlign: 'center' },
  actions: { gap: 12 },
}));
