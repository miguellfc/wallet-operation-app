import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { onColor } from '@/lib/color';
import { StickyHeader } from '@/components/home/sticky-header';
import { BackHeader } from '@/components/settings/back-header';
import { operationSign, walletAmount } from '@/components/operations/operation-row';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/ui/category-icon';
import { showConfirm } from '@/components/ui/confirm-dialog';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Stagger } from '@/components/ui/stagger';
import { RevealScrollView } from '@/components/ui/scroll-reveal';
import { Skeleton, SkeletonDetails, SkeletonSummary } from '@/components/ui/skeleton';
import { categoryIconName } from '@/features/categories/categories-api';
import { deleteOperation, loadOperation, type Operation } from '@/features/operations/operations-api';
import { ApiError } from '@/lib/api';
import { formatAmount } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, radius, spacing, themedStyles, typography } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';
import { useCategoryColor } from '@/features/categories/category-colors';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const TYPE_LABELS: Record<Operation['type'], string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Gasto',
  TRANSFER: 'Transferencia',
  OPENING: 'Saldo inicial',
};

const typeColor = (type: Operation['type']) =>
  type === 'EXPENSE' ? colors.expense : type === 'TRANSFER' ? colors.brand : colors.income;

const GLOWS = [
  { left: '50%', top: '18%' },
  { left: '84%', top: '30%' },
  { left: '20%', top: '52%' },
] as const;

const pad = (value: number) => String(value).padStart(2, '0');

function dateLabel(iso: string) {
  const date = new Date(iso);
  const hours = date.getUTCHours();
  const time = `${pad(hours % 12 || 12)}:${pad(date.getUTCMinutes())} ${hours < 12 ? 'AM' : 'PM'}`;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} ${time}`;
}

const dayParam = (iso: string) => iso.slice(0, 10);

function deleteErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  if (error.reference === 'DEBT_PENDING_NEGATIVE') return 'No se puede eliminar: la deuda quedaría con un pendiente negativo.';
  if (error.status === 404) return 'Esta operación ya no existe.';
  return 'No se pudo eliminar la operación. Vuelve a intentarlo.';
}

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  if (error.status === 404) return 'Esta operación ya no existe.';
  return 'El servidor no pudo cargar la operación. Vuelve a intentarlo en un momento.';
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function detailRows(operation: Operation) {
  const { from, to } = operation.wallets;
  if (operation.type === 'TRANSFER') {
    const rows = [];
    if (operation.amount.from) rows.push({ label: 'Importe', value: formatAmount(operation.amount.from.amount, operation.amount.from.currency) });
    if (operation.amount.to && operation.amount.to.currency !== operation.amount.from?.currency)
      rows.push({ label: 'Recibido', value: formatAmount(operation.amount.to.amount, operation.amount.to.currency) });
    rows.push({ label: 'Fecha', value: dateLabel(operation.date) });
    rows.push({ label: 'De', value: from?.name ?? '—' });
    rows.push({ label: 'A', value: to?.name ?? '—' });
    rows.push({ label: 'Tipo', value: TYPE_LABELS.TRANSFER });
    return rows;
  }
  const { amount, currency } = walletAmount(operation);
  const wallet = operation.type === 'EXPENSE' ? from : to;
  return [
    { label: 'Importe', value: formatAmount(amount, currency) },
    { label: 'Fecha', value: dateLabel(operation.date) },
    { label: 'Billetera', value: wallet?.name ?? '—' },
    { label: 'Tipo', value: operation.debt ? `${TYPE_LABELS[operation.type]} · Préstamo` : TYPE_LABELS[operation.type] },
  ];
}

export default function OperationDetailScreen() {
  useThemeName();
  const insets = useSafeAreaInsets();
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const load = useCallback(() => loadOperation(id), [id]);
  const { data: operation, error: loadError, retry } = useApiData(load);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryColor = useCategoryColor();
  const current = operation && operation._id === id ? operation : null;
  const opening = current?.type === 'OPENING';
  const debtOpening = current?.debt?.action === 'OPENING';
  const chip = current?.type === 'TRANSFER' ? 'Transferencia' : opening ? 'Saldo inicial' : (current?.category?.name ?? '');
  const accent = current ? categoryColor(current.category, typeColor(current.type)) : colors.brand;
  const icon =
    current?.type === 'TRANSFER'
      ? 'Transferencia'
      : opening
        ? 'Saldo inicial'
        : current?.category
          ? categoryIconName(current.category)
          : '';

  const edit = () => {
    if (!current) return;
    router.navigate({ pathname: '/add-operation', params: { edit: current._id, at: String(Date.now()) } } as Href);
  };

  const remove = () => {
    if (!current) return;
    showConfirm({
      title: 'Eliminar operación',
      message: debtOpening
        ? 'Es la apertura de una deuda: se eliminará la deuda completa con todos sus pagos. Esta acción no se puede deshacer.'
        : 'Se eliminará esta operación y dejará de contar en tus saldos. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setDeleting(true);
        setError(null);
        try {
          await deleteOperation(current._id);
          router.dismissTo({ pathname: '/operations', params: { day: dayParam(current.date), at: String(Date.now()) } } as Href);
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
          <BackHeader title="Operación" />
          {!current ? (
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
                <SkeletonDetails rows={5} />
              </Skeleton>
            )
          ) : (
            <>
              <View style={styles.summary}>
                <View style={[styles.iconCircle, { backgroundColor: accent }]}>
                  <CategoryIcon name={icon} color={onColor(accent)} size={33} />
                </View>
                <Text style={styles.description} numberOfLines={2}>
                  {current.description || chip}
                </Text>
                {chip !== '' && (
                  <View style={styles.chip}>
                    <Text style={styles.chipLabel}>{chip}</Text>
                  </View>
                )}
                <Text
                  style={[styles.amount, { color: typeColor(current.type) }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.4}>
                  {formatAmount(walletAmount(current).amount, walletAmount(current).currency, operationSign(current.type))}
                </Text>
              </View>
              <View style={styles.details}>
                <Text style={styles.detailsTitle} accessibilityRole="header">
                  Detalles
                </Text>
                <View style={styles.rows}>
                  {detailRows(current).map(row => (
                    <DetailRow key={row.label} label={row.label} value={row.value} />
                  ))}
                </View>
                {error && (
                  <Text style={styles.error} accessibilityLiveRegion="polite">
                    {error}
                  </Text>
                )}
                {opening ? (
                  <Text style={styles.note}>El saldo inicial se gestiona desde su billetera.</Text>
                ) : (
                  <View style={styles.actions}>
                    <View style={styles.action}>
                      <Button label="Editar" onPress={edit} disabled={deleting} />
                    </View>
                    <View style={styles.action}>
                      <Button label="Eliminar" variant="danger" onPress={remove} loading={deleting} />
                    </View>
                  </View>
                )}
              </View>
            </>
          )}
        </Stagger>
      </RevealScrollView>
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
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: { width: 62, height: 62, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  description: { ...typography.titleSection, color: colors.textPrimary, textAlign: 'center' },
  amount: { ...typography.displayAmount },
  chip: { borderRadius: radius.full, backgroundColor: colors.segment, paddingHorizontal: spacing.xl, paddingVertical: 6 },
  chipLabel: { ...typography.bodyRegular, lineHeight: 20, color: colors.textSecondary },
  details: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  detailsTitle: { ...typography.bodyMedium, fontFamily: typography.titleSection.fontFamily, fontSize: 16, color: colors.textPrimary },
  rows: { gap: spacing.lg },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  detailLabel: { ...typography.labelOverline, width: 120, maxWidth: '45%', flexShrink: 0, color: colors.textSecondary },
  detailValue: { ...typography.bodyMedium, fontSize: 13, flex: 1, textAlign: 'right', color: colors.textPrimary },
  actions: { flexDirection: 'row', gap: 18, marginTop: spacing.sm },
  action: { flex: 1 },
  pressed: { opacity: 0.85 },
  note: { ...typography.bodyMedium, color: colors.textMuted, textAlign: 'center' },
  error: { ...typography.bodyMedium, color: colors.error, textAlign: 'center' },
  state: { paddingVertical: spacing.xxl, justifyContent: 'center', gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
}));
