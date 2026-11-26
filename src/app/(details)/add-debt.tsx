import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { StickyHeader } from '@/components/home/sticky-header';
import { BackHeader } from '@/components/settings/back-header';
import { AmountField } from '@/components/ui/amount-field';
import { Button } from '@/components/ui/button';
import { ColorField } from '@/components/ui/color-field';
import { DateTimeField } from '@/components/ui/date-time-field';
import { OptionSheet } from '@/components/ui/option-sheet';
import { ScreenBackground } from '@/components/ui/screen-background';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { Stagger } from '@/components/ui/stagger';
import { RevealScrollView } from '@/components/ui/scroll-reveal';
import { Skeleton, SkeletonForm } from '@/components/ui/skeleton';
import {
  canPickContact,
  createDebt,
  loadDebtEditing,
  pickContactName,
  updateDebt,
  type DebtEditing,
  type DebtType,
} from '@/features/debts/debt-form-api';
import { updateOperation } from '@/features/operations/operation-form-api';
import { DEFAULT_WALLET_COLOR } from '@/features/wallets/wallet-options';
import { loadWallets, type WalletSummary } from '@/features/wallets/wallets-api';
import { ApiError } from '@/lib/api';
import { formatAmount, roundTo } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, radius, spacing, themedStyles, typography } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';

const TYPES: { value: DebtType; label: string }[] = [
  { value: 'BORROWED', label: 'Pedí prestado' },
  { value: 'LENT', label: 'Presté' },
];

const GLOWS = [
  { left: '84%', top: '16%' },
  { left: '47%', top: '27%' },
  { left: '72%', top: '36%' },
  { left: '19%', top: '54%' },
] as const;

const USER_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><circle cx="12" cy="6" r="4"/><ellipse cx="12" cy="17" rx="7" ry="4"/></g></svg>';

const toUtcInstant = (date: Date) =>
  new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()),
  ).toISOString();

// dismissTo goes back to the screen if it's already in the history instead of stacking a new one on top of the
// form, so "Atrás" never returns to the form after saving.
const openDebts = () =>
  router.dismissTo({ pathname: '/wallets', params: { section: 'DEBTS', at: String(Date.now()) } } as Href);

const openDebt = (id: string) =>
  router.dismissTo({ pathname: '/debt-detail', params: { id, at: String(Date.now()) } } as Href);

const fromUtcWallTime = (iso: string) => {
  const date = new Date(iso);
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  );
};

const openingAmount = ({ debt, opening }: DebtEditing) =>
  (debt.type === 'LENT' ? opening.amount.from : opening.amount.to)?.amount ?? 0;

const walletBalance = (wallet: WalletSummary) => formatAmount(wallet.balance, wallet.currencyCode);

function saveErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  if (error.reference === 'INSUFFICIENT_BALANCE') return 'La billetera no tiene saldo suficiente para prestar ese importe.';
  if (error.reference === 'AMOUNT_DECIMALS_EXCEEDED')
    return 'El importe tiene más decimales de los que admite la moneda de la billetera.';
  if (error.reference === 'LOAN_CATEGORY_NOT_FOUND') return 'Falta la categoría Préstamo de tu cuenta.';
  if (error.reference === 'DEBT_PENDING_NEGATIVE')
    return 'El importe no puede ser menor que lo que ya se ha pagado de la deuda.';
  if (error.reference === 'DEBT_WALLET_CURRENCY_MISMATCH') return 'La billetera debe tener la moneda de la deuda.';
  if (error.status === 404) return 'La billetera ya no existe. Elige otra.';
  return 'No se pudo guardar la deuda. Vuelve a intentarlo.';
}

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  if (error.status === 404) return 'Esta deuda ya no existe.';
  return 'El servidor no pudo cargar tus billeteras. Vuelve a intentarlo en un momento.';
}

export default function AddDebtScreen() {
  useThemeName();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ edit?: string; at?: string }>();
  const editId = params.edit;
  const { data, error: loadError, retry } = useApiData(loadWallets);
  const loadEditing = useCallback(() => (editId ? loadDebtEditing(editId) : Promise.resolve(null)), [editId]);
  const { data: editingData, error: editError, retry: retryEditing } = useApiData(loadEditing);
  const editing = editId && editingData?.debt._id === editId ? editingData : null;

  const [type, setType] = useState<DebtType>('LENT');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date());
  const [color, setColor] = useState(DEFAULT_WALLET_COLOR);
  const [description, setDescription] = useState('');
  const [wallet, setWallet] = useState<string>();
  const [walletSheet, setWalletSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<string>();

  const request = `${editId ?? ''}:${params.at ?? ''}`;
  if (request !== opened && (!editId || editing)) {
    setOpened(request);
    if (editing) {
      setType(editing.debt.type);
      setPerson(editing.debt.person);
      setAmount(String(openingAmount(editing)));
      setDate(fromUtcWallTime(editing.debt.date));
      setColor(editing.debt.color ?? DEFAULT_WALLET_COLOR);
      setDescription(editing.debt.description ?? '');
      setWallet(editing.debt.wallet.id);
      setError(null);
    } else if (opened !== undefined) {
      setType('LENT');
      setPerson('');
      setAmount('');
      setDate(new Date());
      setColor(DEFAULT_WALLET_COLOR);
      setDescription('');
      setWallet(undefined);
      setError(null);
    }
  }

  const lent = type === 'LENT';
  const wallets = (data?.wallets ?? []).filter(
    item => !editing || item.currencyCode === editing.debt.currency.code,
  );
  const selectedWallet = wallets.find(item => item.id === wallet);
  const parsedAmount = Number(amount);
  const validAmount = amount !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const available =
    selectedWallet && editing && selectedWallet.id === editing.debt.wallet.id
      ? selectedWallet.balance + openingAmount(editing)
      : (selectedWallet?.balance ?? 0);
  const insufficient =
    lent &&
    validAmount &&
    !!selectedWallet &&
    roundTo(parsedAmount - available, selectedWallet.decimals) > 0;
  const complete = person.trim() !== '' && validAmount && !!selectedWallet && !insufficient;
  const warning =
    insufficient && selectedWallet
      ? `No hay saldo suficiente en ${selectedWallet.name}: tiene ${walletBalance(selectedWallet)}.`
      : null;

  const clearError = () => setError(null);

  const chooseContact = async () => {
    try {
      const name = await pickContactName();
      if (name) {
        setPerson(name);
        clearError();
      }
    } catch {
      setError('No se pudo abrir tus contactos. Escribe el nombre a mano.');
    }
  };

  const reset = () => {
    setPerson('');
    setAmount('');
    setDate(new Date());
    setColor(DEFAULT_WALLET_COLOR);
    setDescription('');
    setError(null);
  };

  const save = async () => {
    if (!complete || !selectedWallet || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const walletChanged = selectedWallet.id !== editing.debt.wallet.id;
        if (walletChanged || parsedAmount !== openingAmount(editing)) {
          await updateOperation(editing.opening._id, {
            amount: parsedAmount,
            ...(lent ? { from: selectedWallet.id } : { to: selectedWallet.id }),
          });
        }
        await updateDebt(editing.debt._id, {
          person: person.trim(),
          date: toUtcInstant(date),
          color,
          description: description.trim(),
        });
        openDebt(editing.debt._id);
        return;
      }
      await createDebt({
        person: person.trim(),
        type,
        amount: parsedAmount,
        wallet: selectedWallet.id,
        date: toUtcInstant(date),
        color,
        description: description.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
      reset();
      openDebts();
    } catch (reason) {
      setError(saveErrorMessage(reason));
    } finally {
      setSaving(false);
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
          <BackHeader title={editId ? 'Editar deuda' : 'Añadir deuda'} />
          {!data || (editId && !editing) ? (
            loadError || (editId && editError) ? (
              <View style={styles.state}>
                <Text style={styles.stateText} accessibilityLiveRegion="polite">
                  {loadErrorMessage(loadError ?? editError)}
                </Text>
                <Button label="Reintentar" onPress={loadError ? retry : retryEditing} />
              </View>
            ) : (
              <Skeleton>
                <SkeletonForm fields={5} />
              </Skeleton>
            )
          ) : (
            <View style={styles.form}>
              {!editing && (
                <SegmentedControl
                  options={TYPES}
                  value={type}
                  onChange={next => {
                    setType(next);
                    clearError();
                  }}
                  activeColor={colors.brand}
                  compact
                />
              )}
              <TextField
                label="Nombre"
                value={person}
                onChangeText={value => {
                  setPerson(value);
                  clearError();
                }}
                placeholder={lent ? '¿A quién le prestaste?' : '¿De quién pediste prestado?'}
                maxLength={60}
                accessory={
                  canPickContact && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Elegir de contactos"
                      hitSlop={8}
                      onPress={chooseContact}
                      style={({ pressed }) => [styles.contact, pressed && styles.pressed]}>
                      <SvgXml xml={USER_ICON} color={colors.income} width={20} height={20} />
                    </Pressable>
                  )
                }
              />
              <AmountField
                label="Importe"
                value={amount}
                currencyCode={selectedWallet?.currencyCode}
                decimals={selectedWallet?.decimals}
                onChange={value => {
                  setAmount(value);
                  clearError();
                }}
              />
              <View style={styles.row}>
                <DateTimeField label="Fecha" mode="date" value={date} style={styles.dateField} onChange={setDate} />
                <DateTimeField label="Hora" mode="time" value={date} style={styles.dateField} onChange={setDate} />
              </View>
              <ColorField label="Color" value={color} onChange={setColor} />
              <TextField
                label="Descripción"
                value={description}
                onChangeText={setDescription}
                placeholder="¿Para qué es?"
                maxLength={120}
              />
              <SelectField
                label="Billetera"
                value={selectedWallet && `${selectedWallet.name} · ${walletBalance(selectedWallet)}`}
                placeholder="Selecciona una billetera"
                onPress={() => setWalletSheet(true)}
              />
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
        </Stagger>
      </RevealScrollView>
      <OptionSheet
        visible={walletSheet}
        title="Billetera"
        options={wallets.map(item => ({ value: item.id, label: item.name, detail: walletBalance(item) }))}
        selected={wallet}
        emptyText="No tienes billeteras"
        iconFor={() => 'billetera'}
        onSelect={value => {
          setWallet(value);
          clearError();
          const next = wallets.find(item => item.id === value);
          if (next && validAmount) setAmount(String(roundTo(parsedAmount, next.decimals)));
        }}
        onClose={() => setWalletSheet(false)}
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
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 20 },
  dateField: { flex: 1 },
  contact: {
    width: 36,
    height: 36,
    marginRight: -spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.categoryIconIncome,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  error: { ...typography.bodyMedium, color: colors.error, textAlign: 'center' },
  action: { marginTop: 19 },
  state: { paddingVertical: spacing.xxl, justifyContent: 'center', gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
}));
