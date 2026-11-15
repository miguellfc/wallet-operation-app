import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { AddHeader } from '@/components/add/add-header';
import { OperationRow } from '@/components/operations/operation-row';
import { AmountField } from '@/components/ui/amount-field';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { OptionSheet } from '@/components/ui/option-sheet';
import { ScreenBackground } from '@/components/ui/screen-background';
import { WalletIcon } from '@/components/wallets/wallet-icon';
import { adjustWalletBalance, loadWalletDetail, type WalletDetail } from '@/features/wallets/wallets-api';
import { ApiError } from '@/lib/api';
import { formatAmount, formatNumber, roundTo } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, fonts, layout, radius, spacing, typography } from '@/theme';

const PAGE = 20;

const GLOWS = [
  { left: '20%', top: '14%' },
  { left: '80%', top: '30%' },
  { left: '30%', top: '62%' },
] as const;

const PEN_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M4 22H20"/><path d="M13.8881 3.66293L14.6296 2.92142C15.8581 1.69286 17.85 1.69286 19.0786 2.92142C20.3071 4.14999 20.3071 6.14188 19.0786 7.37044L18.3371 8.11195M13.8881 3.66293C13.8881 3.66293 13.9807 5.23862 15.3711 6.62894C16.7614 8.01926 18.3371 8.11195 18.3371 8.11195M13.8881 3.66293L7.07106 10.4799C6.60933 10.9416 6.37846 11.1725 6.17992 11.4271C5.94571 11.7273 5.74491 12.0522 5.58107 12.396C5.44219 12.6874 5.33894 12.9972 5.13245 13.6167L4.25745 16.2417M4.25745 16.2417L4.04356 16.8833C3.94194 17.1882 4.02128 17.5243 4.2485 17.7515C4.47573 17.9787 4.81182 18.0581 5.11667 17.9564L5.75834 17.7426L8.38334 16.8675C9.00282 16.6611 9.31256 16.5578 9.60398 16.4189C9.94775 16.2551 10.2727 16.0543 10.5729 15.8201C10.8275 15.6215 11.0584 15.3907 11.5201 14.9289L18.3371 8.11195M5.75834 17.7426L4.25745 16.2417"/></g></svg>';

const PIE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M8.10577 2.7894C7.52766 3.03383 6.97115 3.33327 6.4443 3.6853C4.79981 4.78412 3.51809 6.3459 2.76121 8.17316C2.00433 10.0004 1.8063 12.0111 2.19215 13.9509C2.578 15.8907 3.53041 17.6725 4.92894 19.0711C6.32746 20.4696 8.10929 21.422 10.0491 21.8078C11.9889 22.1937 13.9996 21.9957 15.8268 21.2388C17.6541 20.4819 19.2159 19.2002 20.3147 17.5557C20.6667 17.0288 20.9662 16.4723 21.2106 15.8942C21.8037 14.4913 22.1003 13.7899 21.507 12.8949C20.9138 12 19.9425 12 18 12H16C14.1144 12 13.1716 12 12.5858 11.4142C12 10.8284 12 9.88561 12 8V6C12 4.05748 12 3.08623 11.1051 2.49296C10.2101 1.8997 9.50868 2.19627 8.10577 2.7894Z"/><path d="M14.5 2.31506C18.014 3.21951 20.7805 5.986 21.685 9.50002"/></g></svg>';

const CHEVRON_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9L12 15L5 9"/></svg>';

const nowAsUtcWallTime = () => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes()),
  ).toISOString();
};

const stamp = () => String(Date.now());

const openWallet = (walletId: string) =>
  router.navigate({ pathname: '/wallet-detail', params: { id: walletId, at: stamp() } } as Href);

const editWallet = (walletId: string) =>
  router.navigate({ pathname: '/add-wallet', params: { edit: walletId, at: stamp() } } as Href);

const openOperation = (operationId: string) =>
  router.navigate({ pathname: '/operation-detail', params: { id: operationId, at: stamp() } } as Href);

const countLabel = (count: number) => `${count} ${count === 1 ? 'operación' : 'operaciones'}`;

const isColor = (value: string) => /^#[0-9a-f]{3,8}$/i.test(value);

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  if (error.status === 404) return 'Esta billetera ya no existe.';
  return 'El servidor no pudo cargar la billetera. Vuelve a intentarlo en un momento.';
}

function adjustErrorMessage(error: unknown, currency: string) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  if (error.reference === 'BALANCE_UNCHANGED') return 'La billetera ya tiene ese saldo.';
  if (error.reference === 'AMOUNT_DECIMALS_EXCEEDED') return `El saldo tiene más decimales de los que admite ${currency}.`;
  return 'No se pudo reajustar el saldo. Vuelve a intentarlo.';
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

type AdjustSheetProps = { visible: boolean; detail: WalletDetail; onClose: () => void; onDone: () => void };

function AdjustSheet({ visible, detail, onClose, onDone }: AdjustSheetProps) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const code = detail.wallet.currency.code;

  if (visible !== shown) {
    setShown(visible);
    if (visible) {
      setValue('');
      setError(null);
    }
  }

  const target = value === '' ? null : Number(value);
  const difference = target === null ? 0 : roundTo(target - detail.balance, detail.decimals);
  const hint =
    target === null
      ? 'Escribe el saldo que tiene realmente la billetera.'
      : difference === 0
        ? 'La billetera ya tiene ese saldo.'
        : `Se creará un ${difference > 0 ? 'ingreso' : 'gasto'} de ajuste de ${formatAmount(Math.abs(difference), code)}. No cuenta en las estadísticas.`;

  const save = async () => {
    if (target === null || difference === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      await adjustWalletBalance(detail.wallet._id, target, nowAsUtcWallTime());
      onClose();
      onDone();
    } catch (reason) {
      setError(adjustErrorMessage(reason, code));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} title="Reajustar saldo" onClose={onClose}>
      <DetailRow label="Saldo actual" value={formatAmount(detail.balance, code)} />
      <AmountField
        label="Saldo real"
        value={value}
        currencyCode={code}
        decimals={detail.decimals}
        allowZero
        onChange={next => {
          setValue(next);
          setError(null);
        }}
      />
      <Text style={styles.hint} accessibilityLiveRegion="polite">
        {error ?? hint}
      </Text>
      <Button label="Guardar" onPress={save} loading={saving} disabled={target === null || difference === 0} />
    </BottomSheet>
  );
}

export default function WalletDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const [size, setSize] = useState(PAGE);
  const [openedId, setOpenedId] = useState(id);
  const [switcher, setSwitcher] = useState(false);
  const [adjusting, setAdjusting] = useState(false);

  if (openedId !== id) {
    setOpenedId(id);
    setSize(PAGE);
  }

  const load = useCallback(() => loadWalletDetail(id, size), [id, size]);
  const { data, error: loadError, retry, refresh } = useApiData(load);
  const detail = data && data.wallet._id === id ? data : null;
  const loadingMore = !!detail && detail.operations.length < size && detail.hasMore;

  const color = detail && isColor(detail.wallet.color) ? detail.wallet.color : colors.brand;
  const code = detail?.wallet.currency.code ?? '';

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}>
        <AddHeader title="Billetera" />
        {!detail ? (
          <View style={styles.state}>
            {loadError ? (
              <>
                <Text style={styles.stateText} accessibilityLiveRegion="polite">
                  {loadErrorMessage(loadError)}
                </Text>
                <Button label="Reintentar" onPress={retry} />
              </>
            ) : (
              <ActivityIndicator color={colors.brand} />
            )}
          </View>
        ) : (
          <>
            <View
              style={styles.card}
              accessible={false}
              accessibilityLabel={`${detail.wallet.name}, saldo ${formatAmount(detail.balance, code)}`}>
              <View style={styles.badge} importantForAccessibility="no-hide-descendants">
                <View style={[styles.badgeRing, { borderColor: color }]} />
                <View style={[styles.badgeCircle, { backgroundColor: color }]}>
                  <WalletIcon name={detail.wallet.icon} color={colors.textOnBrand} size={26} />
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Billetera ${detail.wallet.name}`}
                accessibilityHint="Elige otra billetera para ver su detalle"
                hitSlop={8}
                onPress={() => setSwitcher(true)}
                style={({ pressed }) => [styles.nameRow, pressed && styles.pressed]}>
                <Text style={styles.name} numberOfLines={1}>
                  {detail.wallet.name}
                </Text>
                <SvgXml xml={CHEVRON_ICON} color={colors.textPrimary} width={14} height={14} />
              </Pressable>
              <View style={styles.amountRow}>
                <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                  {formatNumber(detail.balance)}
                </Text>
                <Text style={styles.code}>{code}</Text>
              </View>
            </View>
            <View style={styles.details}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Detalles
              </Text>
              <View style={styles.rows}>
                <DetailRow label="Saldo inicial" value={formatAmount(detail.wallet.initAmount ?? 0, code)} />
                <DetailRow label="Ingresos" value={countLabel(detail.counts.income)} />
                <DetailRow label="Gastos" value={countLabel(detail.counts.expense)} />
                <DetailRow label="Transferencias" value={countLabel(detail.counts.transfer)} />
              </View>
              <View style={styles.actions}>
                <View style={styles.adjust}>
                  <Button label="Reajustar saldo" onPress={() => setAdjusting(true)} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Editar billetera"
                  onPress={() => editWallet(id)}
                  style={({ pressed }) => [styles.round, pressed && styles.pressed]}>
                  <SvgXml xml={PEN_ICON} color={colors.textOnBrand} width={20} height={20} />
                </Pressable>
                <Pressable
                  disabled
                  accessibilityRole="button"
                  accessibilityLabel="Estadísticas de la billetera"
                  accessibilityHint="Disponible próximamente"
                  accessibilityState={{ disabled: true }}
                  style={[styles.round, styles.disabled]}>
                  <SvgXml xml={PIE_ICON} color={colors.textOnBrand} width={22} height={22} />
                </Pressable>
              </View>
            </View>
            <Text style={styles.listTitle} accessibilityRole="header">
              Operaciones
            </Text>
            {detail.operations.length === 0 ? (
              <Text style={styles.stateText}>Esta billetera aún no tiene operaciones.</Text>
            ) : (
              <View style={styles.list}>
                {detail.operations.map(operation => (
                  <OperationRow key={operation._id} operation={operation} onPress={() => openOperation(operation._id)} />
                ))}
                {detail.hasMore && (
                  <Button label="Ver más" onPress={() => setSize(current => current + PAGE)} loading={loadingMore} />
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
      {detail && (
        <>
          <OptionSheet
            visible={switcher}
            title="Billeteras"
            options={detail.wallets.map(item => ({ value: item.id, label: item.name, detail: item.currencyCode }))}
            selected={detail.wallet._id}
            emptyText="No tienes billeteras"
            iconFor={() => 'billetera'}
            onSelect={openWallet}
            onClose={() => setSwitcher(false)}
          />
          <AdjustSheet visible={adjusting} detail={detail} onClose={() => setAdjusting(false)} onDone={refresh} />
        </>
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: 15,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  card: {
    minHeight: 161,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.26)',
    paddingHorizontal: 23,
    paddingTop: 70,
    paddingBottom: 21,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  badge: { position: 'absolute', top: 19, right: 21, width: 78, height: 50 },
  badgeCircle: {
    position: 'absolute',
    left: 0,
    width: 50,
    height: 50,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRing: { position: 'absolute', right: 0, width: 50, height: 50, borderRadius: radius.full, borderWidth: 9 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', maxWidth: '70%' },
  name: { fontFamily: fonts.semiBold, fontSize: 18, lineHeight: 24, color: colors.textPrimary, flexShrink: 1 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: 4 },
  amount: { ...typography.displayAmount, color: colors.textPrimary, flexShrink: 1 },
  code: { fontFamily: fonts.light, fontSize: 14, color: colors.textPrimary },
  details: {
    borderRadius: radius.lg,
    backgroundColor: colors.row,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  sectionTitle: { ...typography.bodyMedium, fontFamily: typography.titleSection.fontFamily, fontSize: 16, color: colors.textPrimary },
  rows: { gap: spacing.lg },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  detailLabel: { ...typography.labelOverline, width: 110, color: colors.textSecondary },
  detailValue: { ...typography.bodyMedium, fontSize: 13, flex: 1, textAlign: 'right', color: colors.textPrimary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: spacing.sm },
  adjust: { flex: 1 },
  round: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
  listTitle: { ...typography.bodyMedium, fontFamily: typography.titleSection.fontFamily, fontSize: 16, color: colors.textSecondary, marginTop: spacing.sm },
  list: { gap: spacing.sm },
  hint: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary },
  state: { paddingVertical: spacing.xxl, justifyContent: 'center', gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
});
