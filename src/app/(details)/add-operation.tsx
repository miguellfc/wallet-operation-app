import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { textOn } from '@/lib/color';
import { StickyHeader } from '@/components/home/sticky-header';
import { BackHeader } from '@/components/settings/back-header';
import { RecurrenceSheet } from '@/components/operations/recurrence-sheet';
import { AmountField } from '@/components/ui/amount-field';
import { Button } from '@/components/ui/button';
import { DateTimeField } from '@/components/ui/date-time-field';
import { OptionSheet, type SheetOption } from '@/components/ui/option-sheet';
import { ScreenBackground } from '@/components/ui/screen-background';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { Stagger } from '@/components/ui/stagger';
import { RevealScrollView } from '@/components/ui/scroll-reveal';
import { Skeleton, SkeletonChips, SkeletonForm } from '@/components/ui/skeleton';
import {
  convertAmount,
  createOperation,
  loadOperationForm,
  updateOperation,
  type FormOperationType,
  type FormWallet,
} from '@/features/operations/operation-form-api';
import { loadOperation, type Operation } from '@/features/operations/operations-api';
import {
  createRecurrence,
  recurrenceShortLabel,
  recurrenceSummary,
  type RecurrenceDraft,
} from '@/features/operations/recurrence-form-api';
import { ApiError } from '@/lib/api';
import { formatAmount, roundTo } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, radius, spacing, themedStyles, typography } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';
import { useCategoryColor } from '@/features/categories/category-colors';

type Sheet = 'category' | 'wallet' | 'target';

const TYPES: { value: FormOperationType; label: string }[] = [
  { value: 'INCOME', label: 'Ingresos' },
  { value: 'EXPENSE', label: 'Gastos' },
  { value: 'TRANSFER', label: 'Transferencias' },
];

const GLOWS = [
  { left: '32%', top: '11%' },
  { left: '84%', top: '15%' },
  { left: '29%', top: '41%' },
] as const;

const SHEET_TITLES: Record<Sheet, string> = {
  category: 'Categoría',
  wallet: 'Billetera',
  target: 'A la billetera',
};

const pad = (value: number) => String(value).padStart(2, '0');

const dayParam = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const toUtcInstant = (date: Date) =>
  new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()),
  ).toISOString();

const walletBalance = (wallet: FormWallet) => formatAmount(wallet.balance, wallet.currencyCode);

const fromUtcWallTime = (iso: string) => {
  const date = new Date(iso);
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes());
};

function balanceWithout(wallet: FormWallet, operation?: Operation | null) {
  if (!operation) return wallet.balance;
  const added = operation.wallets.to?.id === wallet.id ? (operation.amount.to?.amount ?? 0) : 0;
  const spent = operation.wallets.from?.id === wallet.id ? (operation.amount.from?.amount ?? 0) : 0;
  return roundTo(wallet.balance - added + spent, wallet.decimals);
}

const walletLabel = (wallet?: FormWallet) => wallet && `${wallet.name} · ${walletBalance(wallet)}`;

const walletOption = (wallet: FormWallet): SheetOption => ({
  value: wallet.id,
  label: wallet.name,
  detail: walletBalance(wallet),
});

function saveErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  if (error.reference === 'AMOUNT_DECIMALS_EXCEEDED')
    return 'El importe tiene más decimales de los que admite la moneda de la billetera.';
  if (error.reference === 'TRANSFER_SAME_WALLET') return 'Elige dos billeteras distintas.';
  if (error.reference === 'INSUFFICIENT_BALANCE') return 'La billetera no tiene saldo suficiente para esta operación.';
  if (error.status === 404) return 'La billetera o la categoría ya no existe. Elige otra.';
  return 'No se pudo guardar la operación. Vuelve a intentarlo.';
}

const RECURRENCE_FAILED =
  'La operación se guardó, pero no se pudo programar la repetición. Vuelve a intentarlo o sigue sin repetición.';

// dismissTo goes back to the screen if it's already in the history instead of stacking a new one on top of the
// form, so "Atrás" never returns to the form after saving.
const openOperations = (day: string) =>
  router.dismissTo({ pathname: '/operations', params: { day, at: String(Date.now()) } } as Href);

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  return 'El servidor no pudo cargar tus billeteras y categorías. Vuelve a intentarlo en un momento.';
}

type Conversion = { key: string; amount?: number; failed?: 'rate' | 'error' };

type Destination = { text: string; muted?: boolean; rateMissing?: boolean };

function useDestination(amount: number | null, from?: FormWallet, to?: FormWallet): Destination | null {
  const [conversion, setConversion] = useState<Conversion>();
  const fromCode = from?.currencyCode ?? '';
  const toCode = to?.currencyCode ?? '';
  const needed = amount !== null && fromCode !== '' && toCode !== '' && fromCode !== toCode;
  const key = needed ? `${amount}|${fromCode}|${toCode}` : '';

  useEffect(() => {
    if (!needed) return;
    let active = true;
    const timer = setTimeout(() => {
      convertAmount(Number(amount), fromCode, toCode)
        .then(result => active && setConversion({ key, amount: result.amount }))
        .catch(
          reason =>
            active &&
            setConversion({ key, failed: reason instanceof ApiError && reason.status === 404 ? 'rate' : 'error' }),
        );
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [needed, key, amount, fromCode, toCode]);

  if (amount === null || !from || !to) return null;
  if (!needed) return { text: formatAmount(amount, toCode) };
  if (conversion?.key !== key) return { text: 'Calculando…', muted: true };
  if (conversion.amount !== undefined) return { text: formatAmount(conversion.amount, toCode) };
  return conversion.failed === 'rate'
    ? { text: 'Sin tasa de cambio', muted: true, rateMissing: true }
    : { text: 'No se pudo calcular', muted: true };
}

export default function AddOperationScreen() {
  useThemeName();
  const insets = useSafeAreaInsets();
  // `wallet` comes from the wallet detail: that wallet is preselected and saving returns to it.
  const params = useLocalSearchParams<{ edit?: string; at?: string; wallet?: string }>();
  const editId = params.edit;
  const fromWallet = editId ? undefined : params.wallet;
  const { data, error: loadError, retry } = useApiData(loadOperationForm);
  const loadEditing = useCallback(() => (editId ? loadOperation(editId) : Promise.resolve(null)), [editId]);
  const { data: editingData, error: editError, retry: retryEditing } = useApiData(loadEditing);
  const editing = editId && editingData?._id === editId ? editingData : null;

  const [type, setType] = useState<FormOperationType>('INCOME');
  const [date, setDate] = useState(() => new Date());
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>();
  const [wallet, setWallet] = useState<string>();
  const [target, setTarget] = useState<string>();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const categoryColor = useCategoryColor();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceDraft | null>(null);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [pending, setPending] = useState<{ operationId: string; day: string } | null>(null);
  const [opened, setOpened] = useState<string>();

  const request = `${editId ?? ''}:${params.at ?? ''}:${fromWallet ?? ''}`;
  if (request !== opened && (!editId || editing)) {
    setOpened(request);
    if (editing) {
      setType(editing.type === 'OPENING' ? 'INCOME' : editing.type);
      setDate(fromUtcWallTime(editing.date));
      const source = editing.type === 'INCOME' ? editing.amount.to : editing.amount.from;
      setAmount(source ? String(source.amount) : '');
      setDescription(editing.description ?? '');
      setCategory(editing.category?.id);
      setWallet(editing.type === 'INCOME' ? editing.wallets.to?.id : editing.wallets.from?.id);
      setTarget(editing.type === 'TRANSFER' ? editing.wallets.to?.id : undefined);
      setRecurrence(null);
      setPending(null);
      setError(null);
    } else if (opened !== undefined) {
      setType('INCOME');
      setDate(new Date());
      setAmount('');
      setDescription('');
      setCategory(undefined);
      setWallet(undefined);
      setTarget(undefined);
      setRecurrence(null);
      setPending(null);
      setError(null);
    }
    if (!editing) setWallet(fromWallet);
  }

  const debtLocked = !!editing?.debt;
  const transfer = type === 'TRANSFER';
  const wallets = data?.wallets ?? [];
  const categories = (data?.categories ?? []).filter(item => item.type === type);
  const selectedWallet = wallets.find(item => item.id === wallet);
  const selectedTarget = wallets.find(item => item.id === target);
  const selectedCategory = categories.find(item => item.id === category);
  const categoryName = selectedCategory?.name ?? (debtLocked ? editing?.category?.name : undefined);
  const available = selectedWallet ? balanceWithout(selectedWallet, editing) : 0;

  const parsedAmount = Number(amount);
  const validAmount = amount !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const sameWallet = transfer && !!wallet && wallet === target;
  const insufficient =
    type !== 'INCOME' &&
    validAmount &&
    !!selectedWallet &&
    roundTo(parsedAmount - available, selectedWallet.decimals) > 0;
  const destination = useDestination(
    transfer && validAmount ? parsedAmount : null,
    selectedWallet,
    transfer && !sameWallet ? selectedTarget : undefined,
  );
  const complete =
    validAmount &&
    !!selectedWallet &&
    !insufficient &&
    !destination?.rateMissing &&
    (transfer ? !!selectedTarget && !sameWallet : debtLocked || !!selectedCategory);
  const warning = sameWallet
    ? 'Elige dos billeteras distintas.'
    : insufficient && selectedWallet
      ? `No hay saldo suficiente en ${selectedWallet.name}: tiene ${formatAmount(available, selectedWallet.currencyCode)}.`
      : destination?.rateMissing && selectedWallet && selectedTarget
        ? `Falta una tasa de cambio para convertir de ${selectedWallet.currencyCode} a ${selectedTarget.currencyCode}.`
        : null;

  const changeType = (next: FormOperationType) => {
    if (debtLocked) return;
    setType(next);
    setCategory(undefined);
    setError(null);
  };

  const reset = () => {
    setDate(new Date());
    setAmount('');
    setDescription('');
    setCategory(undefined);
    setTarget(undefined);
    setRecurrence(null);
    setPending(null);
    setError(null);
  };

  const finish = (day: string) => {
    reset();
    if (fromWallet) {
      router.dismissTo({ pathname: '/wallet-detail', params: { id: fromWallet, at: String(Date.now()) } } as Href);
    } else {
      openOperations(day);
    }
  };

  const schedule = async (operationId: string, day: string, draft: RecurrenceDraft) => {
    try {
      await createRecurrence(operationId, draft);
      return true;
    } catch {
      setPending({ operationId, day });
      setError(RECURRENCE_FAILED);
      return false;
    }
  };

  const retryRecurrence = async () => {
    if (!pending || !recurrence || saving) return;
    setSaving(true);
    setError(null);
    const scheduled = await schedule(pending.operationId, pending.day, recurrence);
    setSaving(false);
    if (scheduled) finish(pending.day);
  };

  const save = async () => {
    if (pending) {
      await retryRecurrence();
      return;
    }
    if (!complete || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateOperation(editing._id, {
          ...(debtLocked ? {} : { type, category: transfer ? undefined : category }),
          date: toUtcInstant(date),
          amount: parsedAmount,
          description: description.trim(),
          from: type === 'INCOME' ? undefined : wallet,
          to: type === 'INCOME' ? wallet : transfer ? target : undefined,
        });
        router.dismissTo({ pathname: '/operation-detail', params: { id: editing._id, at: String(Date.now()) } } as Href);
        return;
      }
      const created = await createOperation({
        type,
        date: toUtcInstant(date),
        amount: parsedAmount,
        description: description.trim() || undefined,
        category: transfer ? undefined : category,
        from: type === 'INCOME' ? undefined : wallet,
        to: type === 'INCOME' ? wallet : transfer ? target : undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
      const day = dayParam(date);
      if (recurrence && !transfer && !(await schedule(created._id, day, recurrence))) return;
      finish(day);
    } catch (reason) {
      setError(saveErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  const sheetOptions: SheetOption[] =
    sheet === 'category'
      ? categories.map(item => ({ value: item.id, label: item.name }))
      : wallets.map(walletOption);

  const sheetSelected = sheet === 'category' ? category : sheet === 'target' ? target : wallet;

  const selectFromSheet = (value: string) => {
    setError(null);
    if (sheet === 'category') setCategory(value);
    else if (sheet === 'target') setTarget(value);
    else {
      setWallet(value);
      const next = wallets.find(item => item.id === value);
      if (next && validAmount) setAmount(String(roundTo(parsedAmount, next.decimals)));
    }
  };

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <StickyHeader />
      <RevealScrollView
        keyboardShouldPersistTaps="handled"
        keyboardAware
        contentContainerStyle={[styles.content, { paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.xxl }]}>
        <Stagger>
          <BackHeader title={editId ? 'Editar operación' : 'Añadir operación'} />
          {!data || (editId && !editing) ? (
            loadError || (editId && editError) ? (
              <View style={styles.state}>
                <Text style={styles.stateText} accessibilityLiveRegion="polite">
                  {loadError ? loadErrorMessage(loadError) : 'No se pudo cargar la operación. Vuelve a intentarlo.'}
                </Text>
                <Button label="Reintentar" onPress={loadError ? retry : retryEditing} />
              </View>
            ) : (
              <Skeleton>
                <SkeletonChips count={3} />
                <SkeletonForm fields={5} />
              </Skeleton>
            )
          ) : (
            <View style={styles.form}>
              {!debtLocked && (
                <SegmentedControl options={TYPES} value={type} onChange={changeType} activeColor={colors.brand} compact />
              )}
              <View style={styles.row}>
                <DateTimeField label="Fecha" mode="date" value={date} style={styles.dateField} onChange={setDate} />
                <DateTimeField label="Hora" mode="time" value={date} style={styles.dateField} onChange={setDate} />
                {!transfer && !editId && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={recurrence ? `Repetición: ${recurrenceSummary(recurrence, date)}` : 'Recurrente'}
                    accessibilityHint="Configura si la operación se repite"
                    accessibilityState={{ disabled: !!pending }}
                    disabled={!!pending}
                    onPress={() => setRecurrenceOpen(true)}
                    style={({ pressed }) => [
                      styles.recurrent,
                      !recurrence && styles.recurrentOff,
                      pressed && styles.pressed,
                    ]}>
                    <Image
                      contentFit="contain"
                      source={require('@/assets/icons/recurrent.svg')}
                      tintColor={recurrence ? textOn(colors.brand) : colors.brand}
                      style={styles.recurrentIcon}
                    />
                    <Text
                      style={[styles.recurrentLabel, !recurrence && styles.recurrentLabelOff]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}>
                      {recurrence ? recurrenceShortLabel(recurrence) : 'Recurrente'}
                    </Text>
                  </Pressable>
                )}
              </View>
              <AmountField
                label="Importe"
                value={amount}
                currencyCode={selectedWallet?.currencyCode}
                decimals={selectedWallet?.decimals}
                destination={destination ? { text: destination.text, muted: destination.muted } : undefined}
                onChange={value => {
                  setAmount(value);
                  setError(null);
                }}
              />
              <TextField
                label="Descripción"
                value={description}
                onChangeText={setDescription}
                placeholder="Opcional"
                maxLength={120}
              />
              {!transfer && (
                <SelectField
                  label="Categoría"
                  value={categoryName}
                  placeholder="Selecciona una categoría"
                  onPress={() => !debtLocked && setSheet('category')}
                />
              )}
              <SelectField
                label={transfer ? 'De la billetera' : 'Billetera'}
                value={walletLabel(selectedWallet)}
                placeholder="Selecciona una billetera"
                onPress={() => setSheet('wallet')}
              />
              {transfer && (
                <SelectField
                  label="A la billetera"
                  value={walletLabel(selectedTarget)}
                  placeholder="Selecciona una billetera"
                  onPress={() => setSheet('target')}
                />
              )}
              {(error || warning) && (
                <Text style={styles.error} accessibilityLiveRegion="polite">
                  {error ?? warning}
                </Text>
              )}
              <View style={styles.action}>
                <Button
                  label={pending ? 'Reintentar repetición' : 'Guardar'}
                  onPress={save}
                  loading={saving}
                  disabled={!pending && !complete}
                />
                {pending && (
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={8}
                    disabled={saving}
                    onPress={() => finish(pending.day)}
                    style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
                    <Text style={styles.skipLabel}>Seguir sin repetición</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </Stagger>
      </RevealScrollView>
      <OptionSheet
        visible={sheet !== null}
        title={sheet ? SHEET_TITLES[sheet] : ''}
        options={sheetOptions}
        selected={sheetSelected}
        emptyText={sheet === 'category' ? 'No tienes categorías de este tipo' : 'No tienes billeteras'}
        iconFor={option =>
          sheet === 'category'
            ? (categories.find(item => item.id === option.value)?.icon ?? option.label)
            : 'billetera'
        }
        colorFor={option => (sheet === 'category' ? categoryColor({ id: option.value }, colors.brand) : colors.brand)}
        onSelect={selectFromSheet}
        onClose={() => setSheet(null)}
      />
      <RecurrenceSheet
        visible={recurrenceOpen}
        value={recurrence}
        start={date}
        onConfirm={setRecurrence}
        onRemove={() => setRecurrence(null)}
        onClose={() => setRecurrenceOpen(false)}
      />
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
  form: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 20, marginTop: -2 },
  dateField: { flex: 1 },
  recurrent: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  recurrentOff: { backgroundColor: colors.input, borderWidth: 1, borderColor: colors.brand },
  recurrentIcon: { width: 17, height: 14 },
  recurrentLabel: { ...typography.labelOverline, textTransform: 'none', color: textOn(colors.brand), flexShrink: 1 },
  recurrentLabelOff: { color: colors.brand },
  pressed: { opacity: 0.85 },
  error: { ...typography.bodyMedium, color: colors.error, textAlign: 'center' },
  action: { marginTop: 12, gap: spacing.md },
  skip: { alignSelf: 'center', paddingVertical: spacing.xs },
  skipLabel: { ...typography.bodyMedium, color: colors.textSecondary },
  state: { paddingVertical: spacing.xxl, justifyContent: 'center', gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
}));
