import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ListOption } from '@/components/ui/list-option';
import { colors, radius, spacing, typography } from '@/theme';

import { fetchCurrencies, type Currency } from './currency-api';

type CurrencySheetProps = {
  visible: boolean;
  title?: string;
  selected: Currency | null;
  onSelect: (currency: Currency) => void;
  onClose: () => void;
};

export function CurrencySheet({ visible, title = 'Moneda principal', selected, onSelect, onClose }: CurrencySheetProps) {
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
    item => item.code.toLowerCase().includes(search) || item.currency.toLowerCase().includes(search),
  );

  const choose = (currency: Currency) => {
    onSelect(currency);
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
          <View style={styles.handle} />
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
            <View style={styles.state}>
              <ActivityIndicator color={colors.brand} />
            </View>
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
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
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.textMuted,
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
});
