import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddHeader } from '@/components/add/add-header';
import { AmountField } from '@/components/ui/amount-field';
import { Button } from '@/components/ui/button';
import { GridSheet } from '@/components/ui/grid-sheet';
import { OptionSheet } from '@/components/ui/option-sheet';
import { ScreenBackground } from '@/components/ui/screen-background';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { WalletIcon } from '@/components/wallets/wallet-icon';
import type { Currency } from '@/features/currencies/currency-api';
import { CurrencySheet } from '@/features/currencies/currency-sheet';
import { createWallet, loadWalletForm } from '@/features/wallets/wallet-form-api';
import {
  DEFAULT_WALLET_COLOR,
  DEFAULT_WALLET_ICON,
  softColor,
  WALLET_COLORS,
  WALLET_ICON_OPTIONS,
  WALLET_TYPES,
  type WalletType,
} from '@/features/wallets/wallet-options';
import { ApiError } from '@/lib/api';
import { currencyDecimals, roundTo } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, radius, spacing, typography } from '@/theme';

type Sheet = 'type' | 'currency' | 'color' | 'icon';

const GLOWS = [
  { left: '47%', top: '19%' },
  { left: '72%', top: '28%' },
  { left: '29%', top: '39%' },
  { left: '72%', top: '56%' },
] as const;

function saveErrorMessage(error: unknown, currency: string) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  if (error.reference === 'EXCHANGE_RATE_REQUIRED') return `Falta la tasa de cambio de ${currency}.`;
  if (error.reference === 'AMOUNT_DECIMALS_EXCEEDED')
    return `El saldo inicial tiene más decimales de los que admite ${currency}.`;
  return 'No se pudo guardar la billetera. Vuelve a intentarlo.';
}

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  return 'El servidor no pudo cargar tu moneda y tus tasas de cambio. Vuelve a intentarlo en un momento.';
}

type PickerBoxProps = { label: string; value: string; onPress: () => void; children: ReactNode };

function PickerBox({ label, value, onPress, children }: PickerBoxProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={{ text: value }}
      onPress={onPress}
      style={({ pressed }) => [styles.picker, pressed && styles.pressed]}>
      {children}
      <Image contentFit="contain" source={require('@/assets/icons/chevron-down.svg')} style={styles.chevron} />
    </Pressable>
  );
}

export default function AddWalletScreen() {
  const insets = useSafeAreaInsets();
  const { data, error: loadError, retry } = useApiData(loadWalletForm);

  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('GENERAL');
  const [currency, setCurrency] = useState<Currency>();
  const [initAmount, setInitAmount] = useState('');
  const [rate, setRate] = useState('');
  const [color, setColor] = useState(DEFAULT_WALLET_COLOR);
  const [icon, setIcon] = useState(DEFAULT_WALLET_ICON);
  const [excluded, setExcluded] = useState(false);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userCode = data?.userCurrency.code ?? '';
  const selectedCurrency = currency ?? data?.userCurrency;
  const code = selectedCurrency?.code ?? '';
  const decimals = selectedCurrency ? currencyDecimals(selectedCurrency.code, selectedCurrency.type) : undefined;
  const sameCurrency = code === userCode;
  const existingRate = sameCurrency ? undefined : data?.rates[code];
  const rateNeeded = !!selectedCurrency && !sameCurrency && existingRate === undefined;
  const parsedRate = Number(rate);
  const validRate = rate !== '' && Number.isFinite(parsedRate) && parsedRate > 0;
  const complete = name.trim() !== '' && !!selectedCurrency && (!rateNeeded || validRate);

  const rateHint = sameCurrency
    ? null
    : existingRate !== undefined
      ? `Se usará tu tasa actual: 1 ${userCode} = ${existingRate} ${code}.`
      : `Cuántos ${code} equivalen a 1 ${userCode}.`;

  const typeLabel = WALLET_TYPES.find(item => item.value === type)?.label;
  const colorLabel = WALLET_COLORS.find(item => item.value === color)?.label ?? color;
  const iconLabel = WALLET_ICON_OPTIONS.find(item => item.value === icon)?.label ?? icon;

  const chooseCurrency = (next: Currency) => {
    setCurrency(next);
    setRate('');
    setError(null);
    if (initAmount !== '') setInitAmount(String(roundTo(Number(initAmount), currencyDecimals(next.code, next.type))));
  };

  const reset = () => {
    setName('');
    setType('GENERAL');
    setCurrency(undefined);
    setInitAmount('');
    setRate('');
    setColor(DEFAULT_WALLET_COLOR);
    setIcon(DEFAULT_WALLET_ICON);
    setExcluded(false);
    setError(null);
  };

  const save = async () => {
    if (!complete || !selectedCurrency || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createWallet({
        name: name.trim(),
        type,
        currency: selectedCurrency.code,
        currencyType: selectedCurrency.type,
        initAmount: initAmount === '' ? 0 : Number(initAmount),
        exchangeRate: rateNeeded ? parsedRate : undefined,
        color,
        icon,
        excluded,
      });
      reset();
      router.navigate('/wallets' as Href);
    } catch (reason) {
      setError(saveErrorMessage(reason, code));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}>
        <AddHeader title="Añadir billetera" />
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
            <TextField
              label="Nombre"
              value={name}
              onChangeText={value => {
                setName(value);
                setError(null);
              }}
              placeholder="Ej. Banco, Ahorros"
              maxLength={40}
            />
            <SelectField label="Tipo" value={typeLabel} onPress={() => setSheet('type')} />
            <SelectField
              label="Moneda"
              value={selectedCurrency && `${selectedCurrency.code} · ${selectedCurrency.currency}`}
              onPress={() => setSheet('currency')}
            />
            <View style={styles.row}>
              <View style={styles.half}>
                <AmountField
                  label="Saldo inicial"
                  value={initAmount}
                  currencyCode={code}
                  decimals={decimals}
                  onChange={value => {
                    setInitAmount(value);
                    setError(null);
                  }}
                />
              </View>
              <View style={styles.half}>
                <AmountField
                  label="Tasa de cambio"
                  value={existingRate !== undefined ? String(existingRate) : rate}
                  placeholder={sameCurrency ? 'No hace falta' : 'Obligatoria'}
                  disabled={!rateNeeded}
                  onChange={value => {
                    setRate(value);
                    setError(null);
                  }}
                />
              </View>
            </View>
            {rateHint && <Text style={styles.hint}>{rateHint}</Text>}
            <View style={styles.row}>
              <View style={styles.colorColumn}>
                <Text style={styles.label}>Color</Text>
                <PickerBox label="Color" value={colorLabel} onPress={() => setSheet('color')}>
                  <View style={[styles.swatch, { backgroundColor: color }]} />
                </PickerBox>
              </View>
              <View style={styles.iconColumn}>
                <Text style={styles.label}>Ícono</Text>
                <PickerBox label="Ícono" value={iconLabel} onPress={() => setSheet('icon')}>
                  <View style={[styles.iconBox, { backgroundColor: softColor(color, 0.1) }]}>
                    <WalletIcon name={icon} color={color} size={24} />
                  </View>
                </PickerBox>
              </View>
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel="Excluir del saldo"
              accessibilityHint="Ignora el saldo de esta billetera en modo total"
              accessibilityState={{ checked: excluded }}
              onPress={() => setExcluded(value => !value)}
              style={styles.toggleRow}>
              <View style={[styles.track, excluded && styles.trackOn]}>
                <View style={[styles.knob, excluded && styles.knobOn]} />
              </View>
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>Excluir del saldo</Text>
                <Text style={styles.toggleDetail}>Ignora el saldo de esta billetera en modo total</Text>
              </View>
            </Pressable>
            {error && (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {error}
              </Text>
            )}
            <View style={styles.action}>
              <Button label="Guardar" onPress={save} loading={saving} disabled={!complete} />
            </View>
          </View>
        )}
      </ScrollView>
      <OptionSheet
        visible={sheet === 'type'}
        title="Tipo"
        options={WALLET_TYPES}
        selected={type}
        emptyText=""
        iconFor={() => 'billetera'}
        onSelect={value => setType(value as WalletType)}
        onClose={() => setSheet(null)}
      />
      <CurrencySheet
        visible={sheet === 'currency'}
        title="Moneda"
        selected={selectedCurrency ?? null}
        onSelect={chooseCurrency}
        onClose={() => setSheet(null)}
      />
      <GridSheet
        visible={sheet === 'color'}
        title="Color"
        items={WALLET_COLORS}
        selected={color}
        renderItem={item => <View style={[styles.colorDot, { backgroundColor: item.value }]} />}
        onSelect={setColor}
        onClose={() => setSheet(null)}
      />
      <GridSheet
        visible={sheet === 'icon'}
        title="Ícono"
        items={WALLET_ICON_OPTIONS}
        selected={icon}
        renderItem={item => <WalletIcon name={item.value} color={color} size={28} />}
        onSelect={setIcon}
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
  row: { flexDirection: 'row', gap: 20 },
  half: { flex: 1 },
  label: { ...typography.labelOverline, color: colors.textSecondary },
  hint: { ...typography.caption, fontSize: 12, color: colors.textMuted, marginTop: -4 },
  colorColumn: { flex: 227, gap: 10 },
  iconColumn: { flex: 103, gap: 10 },
  picker: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.input,
    paddingLeft: 14,
    paddingRight: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  chevron: { width: 11.5, height: 5.5, marginRight: 4 },
  swatch: { flex: 1, maxWidth: 89, height: 22, borderRadius: 5 },
  iconBox: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  colorDot: { width: '60%', aspectRatio: 1, borderRadius: radius.full },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 10, minHeight: layout.minTouchTarget },
  track: { width: 42, height: 15, borderRadius: radius.md, backgroundColor: 'rgba(255, 255, 255, 0.12)', justifyContent: 'center' },
  trackOn: { backgroundColor: 'rgba(151, 161, 249, 0.35)' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.textMuted, marginLeft: -2 },
  knobOn: { backgroundColor: colors.brand, marginLeft: 22 },
  toggleText: { flex: 1, gap: 4 },
  toggleTitle: { ...typography.bodyMedium, fontFamily: typography.titleSection.fontFamily, fontSize: 13, lineHeight: 18, color: colors.textPrimary },
  toggleDetail: { ...typography.caption, fontSize: 12, lineHeight: 14, color: colors.textMuted },
  error: { ...typography.bodyMedium, color: colors.error, textAlign: 'center' },
  action: { marginTop: 19 },
  state: { paddingVertical: spacing.xxl, justifyContent: 'center', gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
});
