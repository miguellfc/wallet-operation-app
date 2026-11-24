import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StickyHeader } from '@/components/home/sticky-header';
import { BackHeader } from '@/components/settings/back-header';
import { OperationDayList } from '@/components/operations/operation-day-list';
import { operationSign, walletAmount } from '@/components/operations/operation-row';
import { RecurrenceSheet } from '@/components/operations/recurrence-sheet';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/ui/category-icon';
import { showConfirm } from '@/components/ui/confirm-dialog';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Grow } from '@/components/ui/grow';
import { Stagger } from '@/components/ui/stagger';
import { RevealScrollView } from '@/components/ui/scroll-reveal';
import { Skeleton, SkeletonDetails, SkeletonRows, SkeletonSummary } from '@/components/ui/skeleton';
import { categoryIconName } from '@/features/categories/categories-api';
import type { Operation } from '@/features/operations/operations-api';
import {
  deleteRecurrence,
  draftFromRecurrence,
  loadRecurrenceDetail,
  recurrenceShortLabel,
  recurrenceStart,
  recurrenceSummary,
  updateRecurrence,
  type RecurrenceDocument,
  type RecurrenceDraft,
} from '@/features/operations/recurrence-form-api';
import { useThemeName } from '@/features/theme/theme-store';
import { ApiError } from '@/lib/api';
import { formatAmount, longDayLabel, utcDateLabel } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, radius, spacing, themedStyles, typography } from '@/theme';
import { useCategoryColor } from '@/features/categories/category-colors';
import { softColor } from '@/features/wallets/wallet-options';

const PAGE = 20;

const DAY_MS = 86_400_000;

const GLOWS = [
  { left: '20%', top: '14%' },
  { left: '80%', top: '30%' },
  { left: '30%', top: '62%' },
] as const;

const TYPE_LABELS: Record<Operation['type'], string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Gasto',
  TRANSFER: 'Transferencia',
  OPENING: 'Saldo inicial',
};

const CONNECTION_ERROR = 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';

const stamp = () => String(Date.now());

const openOperation = (operationId: string) =>
  router.navigate({ pathname: '/operation-detail', params: { id: operationId, at: stamp() } } as Href);

const editOperation = (operationId: string) =>
  router.navigate({ pathname: '/add-operation', params: { edit: operationId, at: stamp() } } as Href);

const openRecurrences = () =>
  router.navigate({ pathname: '/wallets', params: { section: 'RECURRENCES', at: stamp() } } as Href);

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return CONNECTION_ERROR;
  if (error.status === 404) return 'Esta operación recurrente ya no existe.';
  return 'El servidor no pudo cargar la operación recurrente. Vuelve a intentarlo en un momento.';
}

function actionErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return CONNECTION_ERROR;
  if (error.status === 404) return 'Esta operación recurrente ya no existe.';
  return 'No se pudo completar la acción. Vuelve a intentarlo.';
}

function relativeDay(iso: string) {
  const date = new Date(iso);
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((day - today) / DAY_MS);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `En ${days} días`;
}

function remainingDraft(recurrence: RecurrenceDocument, draft: RecurrenceDraft): RecurrenceDraft {
  if (draft.end !== 'TIMES') return draft;
  const executed = recurrence.configuration.end?.timesExecuted ?? 0;
  return { ...draft, times: Math.max(0, draft.times - executed) };
}

function titleOf(operation?: Operation) {
  return operation?.description || operation?.category?.name || 'Operación recurrente';
}

function walletsOf(operation: Operation) {
  const { from, to } = operation.wallets;
  if (from && to) return `${from.name} → ${to.name}`;
  return (from ?? to)?.name ?? '';
}

function iconOf(operation?: Operation) {
  if (!operation) return 'recurrente';
  if (operation.type === 'TRANSFER') return 'transferencia';
  return operation.category ? categoryIconName(operation.category) : 'recurrente';
}

function DetailRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.detailRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

function EndProgress({ recurrence }: { recurrence: RecurrenceDocument }) {
  const end = recurrence.configuration.end;
  if (end?.type === 'UNTIL' && end.until) {
    return <Text style={styles.endText}>{`Hasta el ${utcDateLabel(end.until)}`}</Text>;
  }
  if (end?.type !== 'TIMES' || !end.times) return <Text style={styles.endText}>Sin fecha de fin</Text>;
  const executed = Math.min(end.timesExecuted ?? 0, end.times);
  const progress = executed / end.times;
  return (
    <View style={styles.progressBlock}>
      <View style={styles.progressLabels}>
        <Text style={styles.endText}>{`${executed} de ${end.times} ejecuciones`}</Text>
        <Text style={styles.endText}>{`Quedan ${end.times - executed}`}</Text>
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: end.times, now: executed }}>
        {progress > 0 && <Grow axis="x" style={[styles.fill, { width: `${progress * 100}%` }]} />}
      </View>
    </View>
  );
}

export default function RecurrenceDetailScreen() {
  useThemeName();
  const insets = useSafeAreaInsets();
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const [size, setSize] = useState(PAGE);
  const [openedId, setOpenedId] = useState(id);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (openedId !== id) {
    setOpenedId(id);
    setSize(PAGE);
    setError(null);
  }

  const load = useCallback(() => loadRecurrenceDetail(id, size), [id, size]);
  const { data, error: loadError, retry, refresh } = useApiData(load);
  const detail = data && data.recurrence._id === id ? data : null;
  const loadingMore = !!detail && detail.operations.length < size && detail.hasMore;

  const recurrence = detail?.recurrence;
  const template = detail?.template;
  const categoryColor = useCategoryColor();
  const draft = recurrence ? draftFromRecurrence(recurrence) : null;
  const start = recurrence ? recurrenceStart(recurrence) : new Date();
  const income = template?.type === 'INCOME';
  const expense = template?.type === 'EXPENSE';
  const accent = income ? colors.income : expense ? colors.expense : colors.brand;
  const iconColor = template?.category ? categoryColor(template.category, accent) : accent;
  const iconBackground = template?.category
    ? softColor(iconColor, 0.12)
    : income
      ? colors.categoryIconIncome
      : expense
        ? colors.categoryIcon
        : colors.incomeSoft;
  const amount = template ? walletAmount(template) : null;
  const total = detail?.total;
  const sign = template ? operationSign(template.type) : '';

  const stop = () => {
    if (!recurrence) return;
    showConfirm({
      title: 'Detener repetición',
      message: 'No se crearán más operaciones. Las operaciones ya creadas se mantienen.',
      confirmLabel: 'Detener',
      onConfirm: async () => {
        setBusy(true);
        setError(null);
        try {
          await deleteRecurrence(recurrence._id);
          openRecurrences();
        } catch (reason) {
          setError(actionErrorMessage(reason));
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const save = async (next: RecurrenceDraft) => {
    if (!recurrence) return;
    setEditing(false);
    setBusy(true);
    setError(null);
    try {
      const executed = recurrence.configuration.end?.timesExecuted ?? 0;
      await updateRecurrence(recurrence._id, next.end === 'TIMES' ? { ...next, times: next.times + executed } : next);
      refresh();
    } catch (reason) {
      setError(actionErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <StickyHeader />
      <RevealScrollView contentContainerStyle={[styles.content, { paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.xxl }]}>
        <Stagger>
          <BackHeader title="Recurrente" />
          {!detail || !recurrence || !draft ? (
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
                <SkeletonDetails rows={5} actions={2} />
                <SkeletonRows count={2} title />
              </Skeleton>
            )
          ) : (
            <>
              <View style={styles.summary}>
                <View style={[styles.iconCircle, { backgroundColor: iconBackground }]}>
                  <CategoryIcon name={iconOf(template)} color={iconColor} size={30} />
                </View>
                <Text style={styles.title} numberOfLines={2}>
                  {titleOf(template)}
                </Text>
                {template && (
                  <View style={styles.chip}>
                    <Text style={styles.chipLabel}>
                      {template.category ? `${TYPE_LABELS[template.type]} · ${template.category.name}` : TYPE_LABELS[template.type]}
                    </Text>
                  </View>
                )}
                {amount && (
                  <Text style={[styles.amount, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
                    {formatAmount(amount.amount, amount.currency, sign)}</Text>
                )}
                <View style={styles.meta}>
                  {template && <Text style={styles.metaText}>{walletsOf(template)}</Text>}
                  <View style={styles.frequency}>
                    <Text style={styles.frequencyLabel}>{recurrenceShortLabel(draft)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.overline}>Próxima ejecución</Text>
                {recurrence.completed || !recurrence.nextExecution ? (
                  <Text style={styles.nextDate}>Finalizada</Text>
                ) : (
                  <View style={styles.nextRow}>
                    <Text style={styles.nextDate}>{longDayLabel(recurrence.nextExecution)}</Text>
                    <Text style={styles.nextRelative}>{relativeDay(recurrence.nextExecution)}</Text>
                  </View>
                )}
                <EndProgress recurrence={recurrence} />
              </View>

              <View style={styles.details}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  Detalles
                </Text>
                {!recurrence.completed && (
                  <Text style={styles.summaryText}>{recurrenceSummary(remainingDraft(recurrence, draft), start)}</Text>
                )}
                <View style={styles.rows}>
                  <DetailRow label="Inicio" value={utcDateLabel(recurrence.startDate)} />
                  <DetailRow label="Última ejecución" value={utcDateLabel(recurrence.lastExecution)} />
                  {template && <DetailRow label="Billetera" value={walletsOf(template)} />}
                  {template?.category && <DetailRow label="Categoría" value={template.category.name} />}
                  {total && (
                    <DetailRow label="Total generado" value={formatAmount(total.amount, total.currency, sign)} accent={accent} />
                  )}
                </View>
                {error && (
                  <Text style={styles.error} accessibilityLiveRegion="polite">
                    {error}
                  </Text>
                )}
                <View style={styles.buttons}>
                  <Button label="Editar repetición" onPress={() => setEditing(true)} loading={busy} />
                  <View style={styles.actions}>
                    {template && (
                      <View style={styles.action}>
                        <Button label="Editar operación" variant="outline" onPress={() => editOperation(template._id)} disabled={busy} />
                      </View>
                    )}
                    {!recurrence.completed && (
                      <View style={styles.action}>
                        <Button label="Detener" variant="danger" onPress={stop} disabled={busy} />
                      </View>
                    )}
                  </View>
                  {template && (
                    <Text style={styles.hint}>Los cambios en la operación se aplican a las próximas ejecuciones.</Text>
                  )}
                </View>
              </View>

              <Text style={styles.listTitle} accessibilityRole="header">
                Operaciones
              </Text>
              <View style={styles.list}>
                {detail.operations.length === 0 ? (
                  <Text style={styles.stateText}>Las operaciones de esta repetición ya no existen.</Text>
                ) : (
                  <OperationDayList operations={detail.operations} onPress={operation => openOperation(operation._id)} />
                )}
                {detail.hasMore && (
                  <Button label="Ver más" onPress={() => setSize(current => current + PAGE)} loading={loadingMore} />
                )}
              </View>
            </>
          )}
        </Stagger>
      </RevealScrollView>
      {draft && (
        <RecurrenceSheet
          visible={editing}
          value={recurrence ? remainingDraft(recurrence, draft) : draft}
          start={start}
          onConfirm={save}
          onRemove={() => {
            setEditing(false);
            stop();
          }}
          onClose={() => setEditing(false)}
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
  state: { minHeight: 240, justifyContent: 'center', gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
  summary: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xxl,
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: { width: 62, height: 62, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.titleSection, color: colors.textPrimary, textAlign: 'center' },
  chip: { borderRadius: radius.full, backgroundColor: colors.segment, paddingHorizontal: spacing.xl, paddingVertical: 6 },
  chipLabel: { ...typography.bodyRegular, lineHeight: 20, color: colors.textSecondary },
  amount: { ...typography.displayAmount },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  metaText: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary },
  frequency: { borderRadius: radius.full, backgroundColor: colors.incomeSoft, paddingHorizontal: spacing.md, paddingVertical: 3 },
  frequencyLabel: { ...typography.bodyMedium, fontSize: 12, lineHeight: 18, color: colors.textAccent },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  overline: { ...typography.labelOverline, color: colors.textSecondary },
  nextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.md },
  nextDate: {
    ...typography.bodyMedium,
    fontFamily: typography.titleSection.fontFamily,
    fontSize: 16,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  nextRelative: { ...typography.bodyMedium, fontSize: 13, color: colors.brand },
  endText: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary },
  progressBlock: { gap: spacing.sm },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  track: { height: 12, padding: 2, borderRadius: radius.full, backgroundColor: colors.divider, flexDirection: 'row' },
  fill: { alignSelf: 'stretch', minWidth: 8, borderRadius: radius.full, backgroundColor: colors.brand },
  details: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  sectionTitle: {
    ...typography.bodyMedium,
    fontFamily: typography.titleSection.fontFamily,
    fontSize: 16,
    color: colors.textPrimary,
  },
  summaryText: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary },
  rows: { gap: spacing.lg },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  detailLabel: { ...typography.labelOverline, width: 120, maxWidth: '45%', flexShrink: 0, color: colors.textSecondary },
  detailValue: { ...typography.bodyMedium, fontSize: 13, flex: 1, textAlign: 'right', color: colors.textPrimary },
  buttons: { gap: 14, marginTop: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  action: { flexGrow: 1 },
  pressed: { opacity: 0.85 },
  hint: { ...typography.caption, fontSize: 12, lineHeight: 16, color: colors.textMuted },
  error: { ...typography.bodyMedium, color: colors.error, textAlign: 'center' },
  listTitle: {
    ...typography.bodyMedium,
    fontFamily: typography.titleSection.fontFamily,
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  list: { gap: spacing.sm },
}));
