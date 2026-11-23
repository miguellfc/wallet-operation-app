import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { readable } from '@/lib/color';
import { BackHeader } from '@/components/settings/back-header';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/ui/category-icon';
import { showConfirm } from '@/components/ui/confirm-dialog';
import { ScreenBackground } from '@/components/ui/screen-background';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Stagger } from '@/components/ui/stagger';
import { Reveal } from '@/components/ui/reveal';
import { RevealScrollView } from '@/components/ui/scroll-reveal';
import {
  categoryIconName,
  deleteCategory,
  loadCategories,
  type Category,
  type CategoryType,
} from '@/features/categories/categories-api';
import { softColor } from '@/features/wallets/wallet-options';
import { ApiError } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, radius, spacing, themedStyles, typography } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';

const TYPES: { value: CategoryType; label: string }[] = [
  { value: 'EXPENSE', label: 'Gastos' },
  { value: 'INCOME', label: 'Ingresos' },
];

const GLOWS = [
  { left: '82%', top: '18%' },
  { left: '8%', top: '44%' },
  { left: '84%', top: '70%' },
] as const;

const PEN_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M4 22H20"/><path d="M13.8881 3.66293L14.6296 2.92142C15.8581 1.69286 17.85 1.69286 19.0786 2.92142C20.3071 4.14999 20.3071 6.14188 19.0786 7.37044L18.3371 8.11195M13.8881 3.66293C13.8881 3.66293 13.9807 5.23862 15.3711 6.62894C16.7614 8.01926 18.3371 8.11195 18.3371 8.11195M13.8881 3.66293L7.07106 10.4799C6.60933 10.9416 6.37846 11.1725 6.17992 11.4271C5.94571 11.7273 5.74491 12.0522 5.58107 12.396C5.44219 12.6874 5.33894 12.9972 5.13245 13.6167L4.25745 16.2417M18.3371 8.11195L11.5201 14.9289C11.0584 15.3907 10.8275 15.6215 10.5729 15.8201C10.2727 16.0543 9.94775 16.2551 9.60398 16.4189C9.31256 16.5578 9.00282 16.6611 8.38334 16.8675L5.75834 17.7426M4.25745 16.2417L4.04356 16.8833C3.94194 17.1882 4.02128 17.5243 4.2485 17.7515C4.47573 17.9787 4.81182 18.0581 5.11667 17.9564L5.75834 17.7426M4.25745 16.2417L5.75834 17.7426"/></g></svg>';

const TRASH_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M20.5 6h-17m15.333 2.5l-.46 6.9c-.177 2.654-.265 3.981-1.13 4.79s-2.196.81-4.856.81h-.774c-2.66 0-3.991 0-4.856-.81c-.865-.809-.954-2.136-1.13-4.79l-.46-6.9"/><path d="M6.5 6h.11a2 2 0 0 0 1.83-1.32l.034-.103l.097-.291c.083-.249.125-.373.18-.479a1.5 1.5 0 0 1 1.094-.788C9.962 3 10.093 3 10.355 3h3.29c.262 0 .393 0 .51.019a1.5 1.5 0 0 1 1.094.788c.055.106.097.23.18.479l.097.291A2 2 0 0 0 17.5 6"/></g></svg>';

const isColor = (value?: string): value is string => !!value && /^#[0-9a-f]{3,8}$/i.test(value);

const openForm = (params: { edit?: string; type: CategoryType }) =>
  router.navigate({ pathname: '/category-form', params: { ...params, at: String(Date.now()) } } as Href);

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  return 'El servidor no pudo cargar tus categorías. Vuelve a intentarlo en un momento.';
}

function deleteErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  if (error.status === 404) return 'Esta categoría ya no existe.';
  return 'No se pudo eliminar la categoría. Vuelve a intentarlo.';
}

type CategoryItemProps = { category: Category; accent: string; onEdit: () => void; onDelete: () => void };

function CategoryItem({ category, accent, onEdit, onDelete }: CategoryItemProps) {
  const color = isColor(category.color) ? category.color : accent;
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Editar ${category.name}`}
        onPress={onEdit}
        style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}>
        <View style={[styles.iconBox, { backgroundColor: softColor(color, 0.12) }]}>
          <CategoryIcon name={categoryIconName(category)} color={readable(color)} />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {category.name}
        </Text>
        <SvgXml xml={PEN_ICON} color={colors.textSecondary} width={20} height={20} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Eliminar ${category.name}`}
        hitSlop={8}
        onPress={onDelete}
        style={({ pressed }) => [styles.trash, pressed && styles.pressed]}>
        <SvgXml xml={TRASH_ICON} color={colors.danger} width={22} height={22} />
      </Pressable>
    </View>
  );
}

export default function CategorySettingsScreen() {
  useThemeName();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: string; at?: string }>();
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [opened, setOpened] = useState<string>();
  const [error, setError] = useState<string | null>(null);

  const request = `${params.type ?? ''}:${params.at ?? ''}`;
  if (request !== opened) {
    setOpened(request);
    if (params.type === 'INCOME' || params.type === 'EXPENSE') setType(params.type);
  }

  const load = useCallback(() => loadCategories(type), [type]);
  const { data, error: loadError, retry, refresh } = useApiData(load);
  const categories = data?.type === type ? data.categories : null;
  const accent = type === 'INCOME' ? colors.income : colors.expense;

  const remove = (category: Category) => {
    showConfirm({
      title: 'Eliminar categoría',
      message: `Se eliminará «${category.name}». Las operaciones que ya la usan la conservan.`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setError(null);
        try {
          await deleteCategory(category._id);
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
          <BackHeader title="Ajustes de categoría" />
          <SegmentedControl
            options={TYPES}
            value={type}
            onChange={next => {
              setType(next);
              setError(null);
            }}
            activeColor={accent}
          />
          {error && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}
          {!categories ? (
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
            <View style={styles.list}>
              {categories.length === 0 ? (
                <Text style={styles.stateText}>
                  {type === 'INCOME' ? 'No tienes categorías de ingresos' : 'No tienes categorías de gastos'}
                </Text>
              ) : (
                categories.map((category, index) => (
                  <Reveal key={category._id} index={index}>
                    <CategoryItem
                      category={category}
                      accent={accent}
                      onEdit={() => openForm({ edit: category._id, type })}
                      onDelete={() => remove(category)}
                    />
                  </Reveal>
                ))
              )}
              <View style={styles.add}>
                <Button label="Añadir categoría" onPress={() => openForm({ type })} />
              </View>
            </View>
          )}
        </Stagger>
      </RevealScrollView>
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
    backgroundColor: colors.row,
    paddingLeft: 14,
    paddingRight: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 76 },
  iconBox: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  name: {
    ...typography.bodyMedium,
    fontFamily: typography.titleSection.fontFamily,
    fontSize: 13,
    flex: 1,
    color: colors.textPrimary,
  },
  trash: { padding: spacing.xs },
  pressed: { opacity: 0.7 },
  add: { marginTop: spacing.sm },
  error: { ...typography.bodyMedium, color: colors.error, textAlign: 'center' },
  state: { paddingVertical: spacing.xxl, justifyContent: 'center', gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },
}));
