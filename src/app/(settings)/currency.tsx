import { router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { BackHeader } from '@/components/settings/back-header';
import { Button } from '@/components/ui/button';
import { showConfirm } from '@/components/ui/confirm-dialog';
import { ScreenBackground } from '@/components/ui/screen-background';
import { SelectField } from '@/components/ui/select-field';
import { Stagger } from '@/components/ui/stagger';
import { RevealScrollView } from '@/components/ui/scroll-reveal';
import { Skeleton, SkeletonForm } from '@/components/ui/skeleton';
import { changeCurrency, currencyErrorMessage } from '@/features/auth/account-api';
import type { Currency } from '@/features/currencies/currency-api';
import { CurrencySheet } from '@/features/currencies/currency-sheet';
import { loadExchangeRates } from '@/features/currencies/exchange-api';
import { ApiError } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, radius, spacing, themedStyles, typography } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';

const GLOWS = [
  { left: '84%', top: '14%' },
  { left: '8%', top: '42%' },
  { left: '80%', top: '72%' },
] as const;

const COINS_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.66 2.69 3 6 3s6-1.34 6-3V7"/><path d="M3 11v4c0 1.66 2.69 3 6 3 1.07 0 2.07-.14 2.94-.39M15 11.5c.32-.03.66-.05 1-.05 3.31 0 6 1.34 6 3s-2.69 3-6 3-6-1.34-6-3"/><path d="M10 14.45v4c0 1.66 2.69 3 6 3s6-1.34 6-3v-4"/></g></svg>';

const RATE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 8h14m0 0l-4-4m4 4l-4 4M20 16H6m0 0l4-4m-4 4l4 4"/></svg>';

const openExchangeRates = () => router.navigate('/exchange-rates' as Href);

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  return 'No se pudo cargar tu moneda. Vuelve a intentarlo en un momento.';
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.sectionTitle} accessibilityRole="header">
      {children}
    </Text>
  );
}

type InfoCardProps = { icon: string; title: string; detail: string };

function InfoCard({ icon, title, detail }: InfoCardProps) {
  return (
    <View style={styles.card} accessible accessibilityLabel={`${title}. ${detail}`}>
      <View style={styles.iconCircle}>
        <SvgXml xml={icon} color={colors.textInverse} width={26} height={26} />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.cardDetail} numberOfLines={3}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

export default function CurrencyScreen() {
  useThemeName();
  const insets = useSafeAreaInsets();
  const { data, error: loadError, retry, refresh } = useApiData(loadExchangeRates);
  const [next, setNext] = useState<Currency | null>(null);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = data?.userCurrency;
  const rate = next ? data?.rates.find(item => item.currency.code === next.code) : undefined;

  const choose = (currency: Currency) => {
    setNext(currency);
    setError(null);
    setNotice(null);
  };

  const apply = async () => {
    if (!next || !current) return;
    setSaving(true);
    setError(null);
    try {
      await changeCurrency(next);
      setNotice(`Tu moneda principal ahora es ${next.code}.`);
      setNext(null);
      refresh();
    } catch (reason) {
      setError(currencyErrorMessage(reason, next.code));
    } finally {
      setSaving(false);
    }
  };

  const confirm = () => {
    if (!next || !current || !rate || saving) return;
    showConfirm({
      title: 'Cambiar moneda principal',
      message: `Tus saldos, operaciones, estadísticas y tasas de cambio pasarán de ${current.code} a ${next.code} con la tasa 1 ${current.code} = ${rate.exchangeRate} ${next.code}.`,
      confirmLabel: `Cambiar a ${next.code}`,
      onConfirm: apply,
    });
  };

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <RevealScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + spacing.xxl }]}>
        <Stagger>
          <BackHeader title="Moneda principal" />
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
                <SkeletonForm fields={3} />
              </Skeleton>
            )
          ) : (
            <>
              <InfoCard
                icon={COINS_ICON}
                title={`${current.code} · ${current.currency}`}
                detail="Es la moneda en la que ves tu saldo total y tus estadísticas"
              />
              <SectionTitle>Cambiar moneda</SectionTitle>
              <View style={styles.form}>
                <SelectField
                  label="Nueva moneda"
                  value={next ? `${next.code} · ${next.currency}` : undefined}
                  placeholder="Elige una moneda"
                  onPress={() => setPicking(true)}
                />
                {next &&
                  (rate ? (
                    <InfoCard
                      icon={RATE_ICON}
                      title={`1 ${current.code} = ${rate.exchangeRate} ${next.code}`}
                      detail="Se usará tu tasa de cambio actual para convertir todo lo registrado"
                    />
                  ) : (
                    <>
                      <Text style={styles.hint}>
                        Para cambiar a {next.code} necesitas una tasa de cambio de {next.code} respecto a {current.code}.
                      </Text>
                      <Button label="Crear tasa de cambio" variant="outline" onPress={openExchangeRates} />
                    </>
                  ))}
                <Text style={styles.hint}>
                  Tus billeteras mantienen su moneda. Solo cambian el saldo total, las estadísticas y las tasas de cambio.
                </Text>
                {(error || notice) && (
                  <Text style={[styles.message, error && styles.hintError]} accessibilityLiveRegion="polite">
                    {error ?? notice}
                  </Text>
                )}
                <Button
                  label={next ? `Cambiar a ${next.code}` : 'Cambiar moneda'}
                  onPress={confirm}
                  loading={saving}
                  disabled={!next || !rate}
                />
              </View>
            </>
          )}
        </Stagger>
      </RevealScrollView>
      <CurrencySheet
        visible={picking}
        title="Nueva moneda"
        selected={next}
        exclude={current ? [current.code] : undefined}
        onSelect={choose}
        onClose={() => setPicking(false)}
      />
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
  sectionTitle: {
    ...typography.bodyMedium,
    fontFamily: typography.titleSection.fontFamily,
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  form: { gap: 12 },
  card: {
    minHeight: 76,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 17,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, gap: 4 },
  cardTitle: { ...typography.bodyMedium, fontFamily: typography.titleSection.fontFamily, fontSize: 16, color: colors.textPrimary },
  cardDetail: { ...typography.caption, fontSize: 12, lineHeight: 16, color: colors.textMuted },
  hint: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary },
  hintError: { color: colors.error },
  message: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
  state: { paddingVertical: spacing.xxl, justifyContent: 'center', gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
}));
