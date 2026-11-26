import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/settings/back-header';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/ui/category-icon';
import { ColorField } from '@/components/ui/color-field';
import { GridSheet } from '@/components/ui/grid-sheet';
import { ScreenBackground } from '@/components/ui/screen-background';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import { Stagger } from '@/components/ui/stagger';
import { RevealScrollView } from '@/components/ui/scroll-reveal';
import { Skeleton, SkeletonForm } from '@/components/ui/skeleton';
import {
  CATEGORY_ICON_OPTIONS,
  DEFAULT_CATEGORY_ICON,
  categoryIconName,
  createCategory,
  loadCategory,
  updateCategory,
  type CategoryType,
} from '@/features/categories/categories-api';
import { refreshCategoryColors } from '@/features/categories/category-colors';
import { DEFAULT_WALLET_COLOR } from '@/features/wallets/wallet-options';
import { ApiError } from '@/lib/api';
import { normalizeName } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, radius, spacing, themedStyles, typography } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';

const TYPES: { value: CategoryType; label: string }[] = [
  { value: 'EXPENSE', label: 'Gastos' },
  { value: 'INCOME', label: 'Ingresos' },
];

const GLOWS = [
  { left: '84%', top: '16%' },
  { left: '10%', top: '40%' },
  { left: '72%', top: '62%' },
] as const;

const openList = (type: CategoryType) =>
  router.canGoBack()
    ? router.back()
    : router.navigate({ pathname: '/category-settings', params: { type, at: String(Date.now()) } } as Href);

const iconLabel = (value: string) => CATEGORY_ICON_OPTIONS.find(item => item.value === value)?.label ?? value;

function saveErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  if (error.status === 404) return 'Esta categoría ya no existe.';
  return 'No se pudo guardar la categoría. Vuelve a intentarlo.';
}

export default function CategoryFormScreen() {
  useThemeName();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ edit?: string; type?: string; at?: string }>();
  const editId = params.edit;
  const loadEditing = useCallback(() => (editId ? loadCategory(editId) : Promise.resolve(null)), [editId]);
  const { data: editingData, error: loadError, retry } = useApiData(loadEditing);
  const editing = editId && editingData?._id === editId ? editingData : null;

  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_WALLET_COLOR);
  const [icon, setIcon] = useState(DEFAULT_CATEGORY_ICON);
  const [iconSheet, setIconSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<string>();

  const request = `${editId ?? ''}:${params.at ?? ''}`;
  if (request !== opened && (!editId || editing)) {
    setOpened(request);
    if (editing) {
      setType(editing.type);
      setName(editing.name);
      setColor(editing.color);
      setIcon(normalizeName(categoryIconName(editing)));
    } else {
      setType(params.type === 'INCOME' ? 'INCOME' : 'EXPENSE');
      setName('');
      setColor(DEFAULT_WALLET_COLOR);
      setIcon(DEFAULT_CATEGORY_ICON);
    }
    setError(null);
  }

  const complete = name.trim() !== '';

  const save = async () => {
    if (!complete || saving) return;
    setSaving(true);
    setError(null);
    const input = { name: name.trim(), color, icon };
    try {
      if (editing) await updateCategory(editing._id, input);
      else await createCategory(type, input);
      refreshCategoryColors();
      openList(type);
    } catch (reason) {
      setError(saveErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <RevealScrollView
        keyboardShouldPersistTaps="handled"
        keyboardAware
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + spacing.xxl }]}>
        <Stagger>
          <BackHeader title={editId ? 'Editar categoría' : 'Añadir categoría'} />
          {editId && !editing ? (
            loadError ? (
              <View style={styles.state}>
                <Text style={styles.stateText} accessibilityLiveRegion="polite">
                  {loadError instanceof ApiError && loadError.status === 404
                    ? 'Esta categoría ya no existe.'
                    : 'No se pudo cargar la categoría. Vuelve a intentarlo.'}
                </Text>
                <Button label="Reintentar" onPress={retry} />
              </View>
            ) : (
              <Skeleton>
                <SkeletonForm fields={3} />
              </Skeleton>
            )
          ) : (
            <View style={styles.form}>
              {!editing && (
                <SegmentedControl
                  options={TYPES}
                  value={type}
                  onChange={setType}
                  activeColor={type === 'INCOME' ? colors.income : colors.expense}
                  compact
                />
              )}
              <TextField
                label="Nombre"
                value={name}
                onChangeText={value => {
                  setName(value);
                  setError(null);
                }}
                placeholder="Supermercado"
                maxLength={40}
              />
              <ColorField label="Color" value={color} onChange={setColor} />
              <View style={styles.field}>
                <Text style={styles.label}>Ícono</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ícono"
                  accessibilityValue={{ text: iconLabel(icon) }}
                  onPress={() => setIconSheet(true)}
                  style={({ pressed }) => [styles.select, pressed && styles.pressed]}>
                  <View style={styles.selectValue}>
                    <View style={styles.iconSlot}>
                      <CategoryIcon name={icon} color={colors.iconOnSurface} size={22} />
                    </View>
                    <Text style={styles.selectText} numberOfLines={1}>
                      {iconLabel(icon)}
                    </Text>
                  </View>
                  <Image contentFit="contain" source={require('@/assets/icons/chevron-down.svg')} tintColor={colors.brand} style={styles.chevron} />
                </Pressable>
              </View>
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
        </Stagger>
      </RevealScrollView>
      <GridSheet
        visible={iconSheet}
        title="Ícono"
        items={CATEGORY_ICON_OPTIONS}
        selected={icon}
        renderItem={item => (
          <View style={styles.gridIcon}>
            <CategoryIcon name={item.value} color={colors.iconOnSurface} size={28} />
          </View>
        )}
        onSelect={setIcon}
        onClose={() => setIconSheet(false)}
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
  form: { gap: 12 },
  field: { gap: 10 },
  label: { ...typography.labelOverline, color: colors.textSecondary },
  select: {
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
  selectValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  iconSlot: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  gridIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  selectText: { ...typography.bodyMedium, color: colors.textPrimary, flexShrink: 1 },
  chevron: { width: 11.5, height: 5.5, marginRight: 4 },
  pressed: { opacity: 0.85 },
  error: { ...typography.bodyMedium, color: colors.error, textAlign: 'center' },
  action: { marginTop: 12 },
  state: { paddingVertical: spacing.xxl, justifyContent: 'center', gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
}));
