import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { onColor } from '@/lib/color';
import { StickyHeader } from '@/components/home/sticky-header';
import { BackHeader } from '@/components/settings/back-header';
import { OperationDayList } from '@/components/operations/operation-day-list';
import { AmountField } from '@/components/ui/amount-field';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/ui/category-icon';
import { showConfirm } from '@/components/ui/confirm-dialog';
import { ScreenBackground } from '@/components/ui/screen-background';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SelectField } from '@/components/ui/select-field';
import { Grow } from '@/components/ui/grow';
import { Stagger } from '@/components/ui/stagger';
import { RevealScrollView } from '@/components/ui/scroll-reveal';
import { Skeleton, SkeletonDetails, SkeletonList, SkeletonRows, SkeletonSummary } from '@/components/ui/skeleton';
import {
  addDebtOperation,
  deleteDebt,
  loadDebtDetail,
  type DebtAction,
  type DebtDetail,
} from '@/features/debts/debt-form-api';
import { loadWallets, type WalletSummary } from '@/features/wallets/wallets-api';
import { ApiError } from '@/lib/api';
import { formatAmount, roundTo } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, radius, spacing, themedStyles, typography } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';

const PAGE = 20;

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const ACTIONS: { value: DebtAction; label: string }[] = [
  { value: 'PAYMENT', label: 'Pago' },
  { value: 'INCREASE', label: 'Aumento' },
];

const GLOWS = [
  { left: '20%', top: '14%' },
  { left: '80%', top: '30%' },
  { left: '30%', top: '62%' },
] as const;

const pad = (value: number) => String(value).padStart(2, '0');

function dateLabel(iso: string) {
  const date = new Date(iso);
  const hours = date.getUTCHours();
  const time = `${pad(hours % 12 || 12)}:${pad(date.getUTCMinutes())} ${hours < 12 ? 'AM' : 'PM'}`;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} ${time}`;
}

const nowAsUtcWallTime = () => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes()),
  ).toISOString();
};

const stamp = () => String(Date.now());

const openOperation = (operationId: string) =>
  router.navigate({ pathname: '/operation-detail', params: { id: operationId, at: stamp() } } as Href);

const editDebt = (debtId: string) =>
  router.navigate({ pathname: '/add-debt', params: { edit: debtId, at: stamp() } } as Href);

const openDebts = () =>
  router.navigate({ pathname: '/wallets', params: { section: 'DEBTS', at: stamp() } } as Href);

const isColor = (value?: string): value is string => !!value && /^#[0-9a-f]{3,8}$/i.test(value);

const walletBalance = (wallet: WalletSummary) => formatAmount(wallet.balance, wallet.currencyCode);

const CONNECTION_ERROR = 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return CONNECTION_ERROR;
  if (error.status === 404) return 'Esta deuda ya no existe.';
  return 'El servidor no pudo cargar la deuda. Vuelve a intentarlo en un momento.';
}

function deleteErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return CONNECTION_ERROR;
  if (error.status === 404) return 'Esta deuda ya no existe.';
  return 'No se pudo eliminar la deuda. Vuelve a intentarlo.';
}

function paymentErrorMessage(error: unknown, currency: string) {
  if (!(error instanceof ApiError)) return CONNECTION_ERROR;
  if (error.reference === 'DEBT_PAYMENT_EXCEEDS_PENDING') return 'El pago supera lo que queda pendiente de la deuda.';
  if (error.reference === 'INSUFFICIENT_BALANCE') return 'La billetera no tiene saldo suficiente para ese importe.';
  if (error.reference === 'AMOUNT_DECIMALS_EXCEEDED') return `El importe tiene más decimales de los que admite ${currency}.`;
  if (error.status === 404)
    return 'No se encontró la billetera o la tasa de cambio entre su moneda y la de la deuda.';
  return 'No se pudo registrar la operación. Vuelve a intentarlo.';
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

type PaymentSheetProps = {
  visible: boolean;
  detail: DebtDetail;
  wallets: WalletSummary[] | undefined;
  onClose: () => void;
  onDone: () => void;
};

function PaymentSheet({ visible, detail, wallets, onClose, onDone }: PaymentSheetProps) {
  const { debt } = detail;
  const code = debt.currency.code;
  const [action, setAction] = useState<DebtAction>('PAYMENT');
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState<string>();
  const [choosing, setChoosing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(false);

  if (visible !== shown) {
    setShown(visible);
    if (visible) {
      setAction(debt.pending > 0 ? 'PAYMENT' : 'INCREASE');
      setAmount('');
      setWallet(debt.wallet.id);
      setChoosing(false);
      setError(null);
    }
  }

  const selected = wallets?.find(item => item.id === wallet);
  const parsed = Number(amount);
  const valid = amount !== '' && Number.isFinite(parsed) && parsed > 0;
  const outgoing = (debt.type === 'LENT') === (action === 'INCREASE');
  const insufficient =
    outgoing && valid && !!selected && roundTo(parsed - selected.balance, selected.decimals) > 0;
  const exceeds =
    action === 'PAYMENT' &&
    valid &&
    selected?.currencyCode === code &&
    roundTo(parsed - debt.pending, detail.decimals) > 0;
  const complete = valid && !!selected && !insufficient && !exceeds;

  const hint =
    insufficient && selected
      ? `No hay saldo suficiente en ${selected.name}: tiene ${walletBalance(selected)}.`
      : exceeds
        ? `El pago no puede superar lo pendiente: ${formatAmount(debt.pending, code)}.`
        : action === 'PAYMENT'
          ? `Pendiente: ${formatAmount(debt.pending, code)}.`
          : 'El importe se sumará a la deuda.';

  const save = async () => {
    if (!complete || !selected || saving) return;
    setSaving(true);
    setError(null);
    try {
      await addDebtOperation(debt._id, { action, amount: parsed, wallet: selected.id, date: nowAsUtcWallTime() });
      onClose();
      onDone();
    } catch (reason) {
      setError(paymentErrorMessage(reason, selected.currencyCode));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} title={choosing ? 'Billetera' : 'Registrar pago'} onClose={onClose}>
      {choosing ? (
        <ScrollView style={styles.walletList} contentContainerStyle={styles.walletListContent}>
          {!wallets ? (
            <Skeleton>
              <SkeletonList count={4} />
            </Skeleton>
          ) : (
            wallets.map(item => {
              const active = item.id === wallet;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setWallet(item.id);
                    setChoosing(false);
                    setError(null);
                    if (valid) setAmount(String(roundTo(parsed, item.decimals)));
                  }}
                  style={({ pressed }) => [styles.walletOption, active && styles.walletActive, pressed && styles.pressed]}>
                  <Text style={[styles.walletName, active && styles.walletNameActive]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.walletBalance}>{walletBalance(item)}</Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      ) : (
        <>
          <SegmentedControl
            options={ACTIONS}
            value={action}
            onChange={next => {
              setAction(next);
              setError(null);
            }}
            activeColor={colors.brand}
            compact
          />
          <AmountField
            label="Importe"
            value={amount}
            currencyCode={selected?.currencyCode}
            decimals={selected?.decimals}
            onChange={next => {
              setAmount(next);
              setError(null);
            }}
          />
          <SelectField
            label="Billetera"
            value={selected && `${selected.name} · ${walletBalance(selected)}`}
            placeholder={wallets ? 'Selecciona una billetera' : 'Cargando billeteras…'}
            onPress={() => setChoosing(true)}
          />
          <Text style={[styles.hint, (error || insufficient || exceeds) && styles.hintError]} accessibilityLiveRegion="polite">
            {error ?? hint}
          </Text>
          <Button label="Guardar" onPress={save} loading={saving} disabled={!complete} />
        </>
      )}
    </BottomSheet>
  );
}

export default function DebtDetailScreen() {
  useThemeName();
  const insets = useSafeAreaInsets();
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const [size, setSize] = useState(PAGE);
  const [openedId, setOpenedId] = useState(id);
  const [paying, setPaying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (openedId !== id) {
    setOpenedId(id);
    setSize(PAGE);
    setError(null);
  }

  const load = useCallback(() => loadDebtDetail(id, size), [id, size]);
  const { data, error: loadError, retry, refresh } = useApiData(load);
  const { data: walletsData, refresh: refreshWallets } = useApiData(loadWallets);
  const detail = data && data.debt._id === id ? data : null;
  const loadingMore = !!detail && detail.operations.length < size && detail.hasMore;

  const debt = detail?.debt;
  const lent = debt?.type === 'LENT';
  const code = debt?.currency.code ?? '';
  const accent = debt && isColor(debt.color) ? debt.color : lent ? colors.income : colors.expense;
  const settled = detail ? roundTo(detail.debt.amount - detail.debt.pending, detail.decimals) : 0;
  const progress = debt && debt.amount > 0 ? Math.min(1, Math.max(0, settled / debt.amount)) : 0;
  const percent = Math.round(progress * 100);
  const percentInside = progress >= 0.2;
  const settledLabel = lent ? 'Recibido' : 'Pagado';

  const remove = () => {
    if (!debt) return;
    showConfirm({
      title: 'Eliminar deuda',
      message: 'Se eliminará la deuda con todos sus pagos y dejarán de contar en tus saldos. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setDeleting(true);
        setError(null);
        try {
          await deleteDebt(debt._id);
          openDebts();
        } catch (reason) {
          setError(deleteErrorMessage(reason));
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <StickyHeader />
      <RevealScrollView contentContainerStyle={[styles.content, { paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.xxl }]}>
        <Stagger>
          <BackHeader title="Deuda" />
          {!detail || !debt ? (
            loadError ? (
              <View style={styles.state}>
                <Text style={styles.stateText} accessibilityLiveRegion="polite">
                  {loadErrorMessage(loadError)}
                </Text>
                <Button label="Reintentar" onPress={retry} />
              </View>
            ) : (
              <Skeleton>
                <SkeletonSummary />
                <SkeletonDetails rows={4} actions={2} />
                <SkeletonRows count={2} title />
              </Skeleton>
            )
          ) : (
            <>
              <View style={styles.summary}>
                <View style={[styles.iconCircle, { backgroundColor: accent }]}>
                  <CategoryIcon name={lent ? 'me debe' : 'le debo'} color={onColor(accent)} size={33} />
                </View>
                <Text style={styles.person} numberOfLines={2}>
                  {debt.person}
                </Text>
                <View style={styles.chip}>
                  <Text style={styles.chipLabel}>{lent ? 'Presté' : 'Me prestaron'}</Text>
                </View>
                <Text
                  style={[styles.pendingAmount, { color: accent }]}
                  accessibilityLabel={`Pendiente: ${formatAmount(debt.pending, code)}`}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.4}>
                  {formatAmount(debt.pending, code)}
                </Text>
                <View style={styles.progressBlock}>
                  <View style={styles.progressLabels}>
                    <View
                      style={styles.progressSide}
                      accessible
                      accessibilityLabel={`${settledLabel}: ${formatAmount(settled, code)}`}>
                      <Text style={styles.progressLabel}>{settledLabel}</Text>
                      <Text style={styles.progressValue}>{formatAmount(settled, code)}</Text>
                    </View>
                    <View
                      style={[styles.progressSide, styles.progressRight]}
                      accessible
                      accessibilityLabel={`Restante: ${formatAmount(debt.pending, code)}`}>
                      <Text style={styles.progressLabel}>Restante</Text>
                      <Text style={styles.progressValue}>{formatAmount(debt.pending, code)}</Text>
                    </View>
                  </View>
                  <View
                    style={styles.track}
                    accessibilityRole="progressbar"
                    accessibilityValue={{ min: 0, max: 100, now: percent }}>
                    {progress > 0 && (
                      <Grow axis="x" style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: accent }]}>
                        {percentInside && <Text style={[styles.percent, styles.percentInside]}>{percent}%</Text>}
                      </Grow>
                    )}
                    {!percentInside && <Text style={styles.percent}>{percent}%</Text>}
                  </View>
                </View>
              </View>
              <View style={styles.details}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  Detalles
                </Text>
                <View style={styles.rows}>
                  <DetailRow label="Importe" value={formatAmount(debt.amount, code)} />
                  <DetailRow label="Fecha" value={dateLabel(debt.date)} />
                  <DetailRow label="Billetera" value={debt.wallet.name} />
                  {!!debt.description && <DetailRow label="Descripción" value={debt.description} />}
                </View>
                {error && (
                  <Text style={styles.error} accessibilityLiveRegion="polite">
                    {error}
                  </Text>
                )}
                <View style={styles.buttons}>
                  <Button label="Registrar pago" onPress={() => setPaying(true)} disabled={deleting} />
                  <View style={styles.actions}>
                    <View style={styles.action}>
                      <Button label="Editar" onPress={() => editDebt(debt._id)} disabled={deleting} />
                    </View>
                    <View style={styles.action}>
                      <Button label="Eliminar" variant="danger" onPress={remove} loading={deleting} />
                    </View>
                  </View>
                </View>
              </View>
              <Text style={styles.listTitle} accessibilityRole="header">
                Operaciones
              </Text>
              <View style={styles.list}>
                <OperationDayList operations={detail.operations} onPress={operation => openOperation(operation._id)} />
                {detail.hasMore && (
                  <Button label="Ver más" onPress={() => setSize(current => current + PAGE)} loading={loadingMore} />
                )}
              </View>
            </>
          )}
        </Stagger>
      </RevealScrollView>
      {detail && (
        <PaymentSheet
          visible={paying}
          detail={detail}
          wallets={walletsData?.wallets}
          onClose={() => setPaying(false)}
          onDone={() => {
            refresh();
            refreshWallets();
          }}
        />
      )}
    </ScreenBackground>
  );
}

const styles = themedStyles(() => ({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: 15,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  summary: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xxl,
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: { width: 62, height: 62, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  person: { ...typography.titleSection, color: colors.textPrimary, textAlign: 'center' },
  pendingAmount: { ...typography.displayAmount },
  chip: { borderRadius: radius.full, backgroundColor: colors.segment, paddingHorizontal: spacing.xl, paddingVertical: 6 },
  chipLabel: { ...typography.bodyRegular, lineHeight: 20, color: colors.textSecondary },
  progressBlock: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.xs },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  progressSide: { gap: 2, flexShrink: 1 },
  progressRight: { alignItems: 'flex-end' },
  progressLabel: { ...typography.labelOverline, color: colors.textSecondary },
  progressValue: { ...typography.bodyMedium, fontSize: 13, color: colors.textPrimary },
  track: {
    minHeight: 30,
    padding: 4,
    borderRadius: 11,
    backgroundColor: colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fill: { alignSelf: 'stretch', minWidth: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'flex-end' },
  percent: { ...typography.labelLegend, color: colors.textSecondary, paddingHorizontal: spacing.sm },
  percentInside: { color: colors.textOnBrand },
  details: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  sectionTitle: { ...typography.bodyMedium, fontFamily: typography.titleSection.fontFamily, fontSize: 16, color: colors.textPrimary },
  rows: { gap: spacing.lg },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  detailLabel: { ...typography.labelOverline, width: 120, maxWidth: '45%', flexShrink: 0, color: colors.textSecondary },
  detailValue: { ...typography.bodyMedium, fontSize: 13, flex: 1, textAlign: 'right', color: colors.textPrimary },
  buttons: { gap: 14, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: 18 },
  action: { flex: 1 },
  pressed: { opacity: 0.85 },
  error: { ...typography.bodyMedium, color: colors.error, textAlign: 'center' },
  listTitle: { ...typography.bodyMedium, fontFamily: typography.titleSection.fontFamily, fontSize: 16, color: colors.textSecondary, marginTop: spacing.sm },
  list: { gap: spacing.sm },
  hint: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary },
  hintError: { color: colors.error },
  walletList: { maxHeight: 360 },
  walletListContent: { gap: spacing.sm, paddingBottom: spacing.lg },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.input,
  },
  walletActive: { backgroundColor: colors.surface, borderColor: colors.brand },
  walletName: { ...typography.bodyMedium, flex: 1, color: colors.textPrimary },
  walletNameActive: { color: colors.brand },
  walletBalance: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary },
  state: { paddingVertical: spacing.xxl, justifyContent: 'center', gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
}));
