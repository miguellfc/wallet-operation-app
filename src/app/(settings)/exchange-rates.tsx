import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { BackHeader } from '@/components/settings/back-header';
import { AmountField } from '@/components/ui/amount-field';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { showConfirm } from '@/components/ui/confirm-dialog';
import { ScreenBackground } from '@/components/ui/screen-background';
import { SelectField } from '@/components/ui/select-field';
import { Stagger } from '@/components/ui/stagger';
import { Reveal } from '@/components/ui/reveal';
import { RevealScrollView } from '@/components/ui/scroll-reveal';
import type { Currency } from '@/features/currencies/currency-api';
import { CurrencySheet } from '@/features/currencies/currency-sheet';
import {
  createExchangeRate,
  deleteExchangeRate,
  loadExchangeRates,
  updateExchangeRate,
  type ExchangeRate,
} from '@/features/currencies/exchange-api';
import { ApiError } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, radius, spacing, themedStyles, typography } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';

const GLOWS = [
  { left: '82%', top: '18%' },
  { left: '8%', top: '44%' },
  { left: '84%', top: '70%' },
] as const;

const PLUS_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" d="M12 4v16M4 12h16"/></svg>';

const PEN_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M4 22H20"/><path d="M13.8881 3.66293L14.6296 2.92142C15.8581 1.69286 17.85 1.69286 19.0786 2.92142C20.3071 4.14999 20.3071 6.14188 19.0786 7.37044L18.3371 8.11195M13.8881 3.66293C13.8881 3.66293 13.9807 5.23862 15.3711 6.62894C16.7614 8.01926 18.3371 8.11195 18.3371 8.11195M13.8881 3.66293L7.07106 10.4799C6.60933 10.9416 6.37846 11.1725 6.17992 11.4271C5.94571 11.7273 5.74491 12.0522 5.58107 12.396C5.44219 12.6874 5.33894 12.9972 5.13245 13.6167L4.25745 16.2417M18.3371 8.11195L11.5201 14.9289C11.0584 15.3907 10.8275 15.6215 10.5729 15.8201C10.2727 16.0543 9.94775 16.2551 9.60398 16.4189C9.31256 16.5578 9.00282 16.6611 8.38334 16.8675L5.75834 17.7426M4.25745 16.2417L4.04356 16.8833C3.94194 17.1882 4.02128 17.5243 4.2485 17.7515C4.47573 17.9787 4.81182 18.0581 5.11667 17.9564L5.75834 17.7426M4.25745 16.2417L5.75834 17.7426"/></g></svg>';

const TRASH_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M20.5 6h-17m15.333 2.5l-.46 6.9c-.177 2.654-.265 3.981-1.13 4.79s-2.196.81-4.856.81h-.774c-2.66 0-3.991 0-4.856-.81c-.865-.809-.954-2.136-1.13-4.79l-.46-6.9"/><path d="M6.5 6h.11a2 2 0 0 0 1.83-1.32l.034-.103l.097-.291c.083-.249.125-.373.18-.479a1.5 1.5 0 0 1 1.094-.788C9.962 3 10.093 3 10.355 3h3.29c.262 0 .393 0 .51.019a1.5 1.5 0 0 1 1.094.788c.055.106.097.23.18.479l.097.291A2 2 0 0 0 17.5 6"/></g></svg>';

const CONNECTION_ERROR = 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';

const rateText = (userCode: string, value: number, code: string) => `1 ${userCode} = ${formatNumber(value)} ${code}`;

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return CONNECTION_ERROR;
  return 'El servidor no pudo cargar tus tasas de cambio. Vuelve a intentarlo en un momento.';
}

function saveErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return CONNECTION_ERROR;
  if (error.reference === 'CURRENCY_EXCHANGE_ALREADY_EXISTS') return 'Ya tienes una tasa para esa moneda.';
  if (error.status === 404) return 'Esta tasa ya no existe.';
  return 'No se pudo guardar la tasa. Vuelve a intentarlo.';
}

function deleteErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return CONNECTION_ERROR;
  if (error.status === 404) return 'Esta tasa ya no existe.';
  return 'No se pudo eliminar la tasa. Vuelve a intentarlo.';
}

type RateSheetProps = {
  visible: boolean;
  editing: ExchangeRate | null;
  userCurrency: Currency;
  taken: string[];
  onClose: () => void;
  onDone: () => void;
};

function RateSheet({ visible, editing, userCurrency, taken, onClose, onDone }: RateSheetProps) {
  const [shown, setShown] = useState(false);
  const [currency, setCurrency] = useState<Currency | null>(null);
  const [value, setValue] = useState('');
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (visible !== shown) {
    setShown(visible);
    if (visible) {
      setCurrency(editing?.currency ?? null);
      setValue(editing ? String(editing.exchangeRate) : '');
      setError(null);
    }
  }

  const parsed = Number(value);
  const valid = value !== '' && Number.isFinite(parsed) && parsed > 0;
  const complete = !!currency && valid;
  const hint = error
    ? error
    : currency
      ? `${rateText(userCurrency.code, valid ? parsed : 0, currency.code)}. Solo afecta a las operaciones nuevas.`
      : `Elige la moneda y cuántas unidades equivalen a 1 ${userCurrency.code}.`;

  const save = async () => {
    if (!complete || !currency || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) await updateExchangeRate(editing._id, parsed);
      else await createExchangeRate(currency, parsed);
      onClose();
      onDone();
    } catch (reason) {
      setError(saveErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} title={editing ? 'Editar tasa' : 'Nueva tasa'} onClose={onClose}>
      {editing ? (
        <View style={styles.fixedField}>
          <Text style={styles.label}>Moneda</Text>
          <Text style={styles.fixedValue}>
            {editing.currency.code} · {editing.currency.currency}
          </Text>
        </View>
      ) : (
        <SelectField
          label="Moneda"
          value={currency ? `${currency.code} · ${currency.currency}` : undefined}
          placeholder="Selecciona una moneda"
          onPress={() => setPicking(true)}
        />
      )}
      <AmountField
        label={`Equivale a 1 ${userCurrency.code}`}
        value={value}
        currencyCode={currency?.code}
        onChange={next => {
          setValue(next);
          setError(null);
        }}
      />
      <Text style={[styles.hint, error && styles.hintError]} accessibilityLiveRegion="polite">
        {hint}
      </Text>
      <Button label="Guardar" onPress={save} loading={saving} disabled={!complete} />
      <CurrencySheet
        visible={picking}
        title="Moneda"
        selected={currency}
        exclude={[userCurrency.code, ...taken]}
        onSelect={next => {
          setCurrency(next);
          setError(null);
        }}
        onClose={() => setPicking(false)}
      />
    </BottomSheet>
  );
}

export default function ExchangeRatesScreen() {
  useThemeName();
  const insets = useSafeAreaInsets();
  const { data, error: loadError, retry, refresh } = useApiData(loadExchangeRates);
  const [sheet, setSheet] = useState<{ editing: ExchangeRate | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = (rate: ExchangeRate) => {
    showConfirm({
      title: 'Eliminar tasa',
      message: `Se eliminará la tasa de ${rate.currency.code}. Para registrar operaciones en billeteras con esa moneda tendrás que crear otra.`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setError(null);
        try {
          await deleteExchangeRate(rate._id);
          refresh();
        } catch (reason) {
          setError(deleteErrorMessage(reason));
        }
      },
    });
  };

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <RevealScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + spacing.xxl }]}>
        <Stagger>
          <BackHeader
            title="Tasas de cambio"
            action={
              data && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Añadir tasa de cambio"
                  hitSlop={10}
                  onPress={() => setSheet({ editing: null })}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <SvgXml xml={PLUS_ICON} color={colors.textPrimary} width={22} height={22} />
                </Pressable>
              )
            }
          />
          {error && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}
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
          ) : data.rates.length === 0 ? (
            <Text style={styles.stateText}>Aún no tienes tasas de cambio. Añade una con el botón +.</Text>
          ) : (
            <View style={styles.list}>
              {data.rates.map((rate, index) => {
                const title = rateText(data.userCurrency.code, rate.exchangeRate, rate.currency.code);
                return (
                  <Reveal key={rate._id} index={index} style={styles.row}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Editar tasa: ${title}`}
                      onPress={() => setSheet({ editing: rate })}
                      style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}>
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {title}
                        </Text>
                        <Text style={styles.rowDetail} numberOfLines={1}>
                          {rate.currency.code} = {rate.currency.currency}
                          {rate.currency.symbol ? ` (${rate.currency.symbol})` : ''}
                        </Text>
                      </View>
                      <SvgXml xml={PEN_ICON} color={colors.textSecondary} width={20} height={20} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Eliminar tasa de ${rate.currency.code}`}
                      hitSlop={8}
                      onPress={() => remove(rate)}
                      style={({ pressed }) => [styles.trash, pressed && styles.pressed]}>
                      <SvgXml xml={TRASH_ICON} color={colors.danger} width={22} height={22} />
                    </Pressable>
                  </Reveal>
                );
              })}
            </View>
          )}
        </Stagger>
      </RevealScrollView>
      {data && (
        <RateSheet
          visible={sheet !== null}
          editing={sheet?.editing ?? null}
          userCurrency={data.userCurrency}
          taken={data.rates.map(rate => rate.currency.code)}
          onClose={() => setSheet(null)}
          onDone={refresh}
        />
      )}
    </ScreenBackground>
  );
}

const styles = themedStyles(() => ({
  content: {
    paddingHorizontal: spacing.xl,
    gap: 15,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  list: { gap: 10 },
  row: {
    minHeight: 76,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.row,
    paddingLeft: spacing.xl,
    paddingRight: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 76 },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { ...typography.bodyMedium, fontFamily: typography.titleSection.fontFamily, fontSize: 13, color: colors.textPrimary },
  rowDetail: { ...typography.caption, color: colors.textMuted },
  trash: { padding: spacing.xs },
  pressed: { opacity: 0.7 },
  label: { ...typography.labelOverline, color: colors.textSecondary },
  fixedField: { gap: 10 },
  fixedValue: { ...typography.bodyMedium, color: colors.textPrimary, paddingVertical: spacing.sm },
  hint: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary },
  hintError: { color: colors.error },
  error: { ...typography.bodyMedium, color: colors.error, textAlign: 'center' },
  state: { paddingVertical: spacing.xxl, justifyContent: 'center', gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },
}));
