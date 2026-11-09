import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddHeader } from '@/components/add/add-header';
import { AmountField } from '@/components/ui/amount-field';
import { Button } from '@/components/ui/button';
import { DateTimeField } from '@/components/ui/date-time-field';
import { OptionSheet, type SheetOption } from '@/components/ui/option-sheet';
import { ScreenBackground } from '@/components/ui/screen-background';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import {
  convertAmount,
  createOperation,
  loadOperationForm,
  type FormOperationType,
  type FormWallet,
} from '@/features/operations/operation-form-api';
import { ApiError } from '@/lib/api';
import { formatAmount, roundTo } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, radius, spacing, typography } from '@/theme';

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
  const insets = useSafeAreaInsets();
  const { data, error: loadError, retry } = useApiData(loadOperationForm);

  const [type, setType] = useState<FormOperationType>('INCOME');
  const [date, setDate] = useState(() => new Date());
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>();
  const [wallet, setWallet] = useState<string>();
  const [target, setTarget] = useState<string>();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transfer = type === 'TRANSFER';
  const wallets = data?.wallets ?? [];
  const categories = (data?.categories ?? []).filter(item => item.type === type);
  const selectedWallet = wallets.find(item => item.id === wallet);
  const selectedTarget = wallets.find(item => item.id === target);
  const selectedCategory = categories.find(item => item.id === category);

  const parsedAmount = Number(amount);
  const validAmount = amount !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const sameWallet = transfer && !!wallet && wallet === target;
  const insufficient =
    type !== 'INCOME' &&
    validAmount &&
    !!selectedWallet &&
    roundTo(parsedAmount - selectedWallet.balance, selectedWallet.decimals) > 0;
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
    (transfer ? !!selectedTarget && !sameWallet : !!selectedCategory);
  const warning = sameWallet
    ? 'Elige dos billeteras distintas.'
    : insufficient && selectedWallet
      ? `No hay saldo suficiente en ${selectedWallet.name}: tiene ${walletBalance(selectedWallet)}.`
      : destination?.rateMissing && selectedWallet && selectedTarget
        ? `Falta una tasa de cambio para convertir de ${selectedWallet.currencyCode} a ${selectedTarget.currencyCode}.`
        : null;

  const changeType = (next: FormOperationType) => {
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
    setError(null);
  };

  const save = async () => {
    if (!complete || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createOperation({
        type,
        date: toUtcInstant(date),
        amount: parsedAmount,
        description: description.trim() || undefined,
        category: transfer ? undefined : category,
        from: type === 'INCOME' ? undefined : wallet,
        to: type === 'INCOME' ? wallet : transfer ? target : undefined,
      });
      const day = dayParam(date);
      reset();
      router.navigate({ pathname: '/operations', params: { day, at: String(Date.now()) } } as Href);
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
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}>
        <AddHeader title="Añadir operación" />
        {!data ? (
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
          <View style={styles.form}>
            <SegmentedControl options={TYPES} value={type} onChange={changeType} activeColor={colors.brand} compact />
            <View style={styles.row}>
              <DateTimeField label="Fecha" mode="date" value={date} onChange={setDate} />
              <DateTimeField label="Hora" mode="time" value={date} onChange={setDate} />
              {!transfer && (
                <Pressable
                  disabled
                  accessibilityRole="button"
                  accessibilityLabel="Recurrente"
                  accessibilityHint="Disponible próximamente"
                  accessibilityState={{ disabled: true }}
                  style={styles.recurrent}>
                  <Image contentFit="contain" source={require('@/assets/icons/recurrent.svg')} style={styles.recurrentIcon} />
                  <Text style={styles.recurrentLabel}>Recurrente</Text>
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
                value={selectedCategory?.name}
                placeholder="Selecciona una categoría"
                onPress={() => setSheet('category')}
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
              <Button label="Guardar" onPress={save} loading={saving} disabled={!complete} />
            </View>
          </View>
        )}
      </ScrollView>
      <OptionSheet
        visible={sheet !== null}
        title={sheet ? SHEET_TITLES[sheet] : ''}
        options={sheetOptions}
        selected={sheetSelected}
        emptyText={sheet === 'category' ? 'No tienes categorías de este tipo' : 'No tienes billeteras'}
        iconFor={option => (sheet === 'category' ? option.label : 'billetera')}
        onSelect={selectFromSheet}
        onClose={() => setSheet(null)}
      />
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
  form: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 20, marginTop: -2 },
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
  recurrentIcon: { width: 17, height: 14 },
  recurrentLabel: { ...typography.labelOverline, textTransform: 'none', color: colors.textOnBrand },
  error: { ...typography.bodyMedium, color: colors.error, textAlign: 'center' },
  action: { marginTop: 12 },
  state: { paddingVertical: spacing.xxl, justifyContent: 'center', gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
});
