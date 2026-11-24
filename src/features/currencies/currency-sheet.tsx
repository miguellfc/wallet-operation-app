import { useEffect, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetModal } from '@/components/ui/sheet-modal';
import { Button } from '@/components/ui/button';
import { ListOption } from '@/components/ui/list-option';
import { Skeleton, SkeletonList } from '@/components/ui/skeleton';
import { colors, radius, spacing, themedStyles, typography } from '@/theme';

import { fetchCurrencies, type Currency } from './currency-api';

type CurrencySheetProps = {
  visible: boolean;
  title?: string;
  selected: Currency | null;
  exclude?: string[];
  onSelect: (currency: Currency) => void;
  onClose: () => void;
};

export function CurrencySheet({
  visible,
  title = 'Moneda principal',
  selected,
  exclude = [],
  onSelect,
  onClose,
}: CurrencySheetProps) {
  const insets = useSafeAreaInsets();
  const [currencies, setCurrencies] = useState<Currency[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible || currencies || failed) return;
    let active = true;
    fetchCurrencies()
      .then(data => active && setCurrencies(data))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [visible, currencies, failed]);

  const search = query.trim().toLowerCase();
  const filtered = (currencies ?? []).filter(
    item =>
      !exclude.includes(item.code) &&
      (item.code.toLowerCase().includes(search) || item.currency.toLowerCase().includes(search)),
  );

  const choose = (currency: Currency) => {
    onSelect(currency);
    setQuery('');
    onClose();
  };

  return (
    <SheetModal visible={visible} onClose={onClose} style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por código o nombre"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.brand}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.search}
          />
          {failed ? (
            <View style={styles.state}>
              <Text style={styles.stateText}>No se pudieron cargar las monedas</Text>
              <Button label="Reintentar" onPress={() => setFailed(false)} />
            </View>
          ) : !currencies ? (
            <Skeleton>
              <SkeletonList count={8} />
            </Skeleton>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => `${item.type}-${item.code}`}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <ListOption
                  code={item.code}
                  name={item.currency}
                  tag={item.type}
                  selected={selected?.code === item.code && selected.type === item.type}
                  onPress={() => choose(item)}
                />
              )}
              ListEmptyComponent={<Text style={styles.stateText}>No hay monedas que coincidan</Text>}
            />
          )}
    </SheetModal>
  );
}

const styles = themedStyles(() => ({
  sheet: {
    height: '80%',
    backgroundColor: colors.bgApp,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  title: { ...typography.titleSection, color: colors.textPrimary },
  search: {
    ...typography.bodyMedium,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.input,
    paddingHorizontal: spacing.lg,
    color: colors.textPrimary,
  },
  list: { gap: spacing.sm, paddingBottom: spacing.lg },
  state: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
}));
