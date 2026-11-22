import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { BackHeader } from '@/components/settings/back-header';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { showConfirm } from '@/components/ui/confirm-dialog';
import { ScreenBackground } from '@/components/ui/screen-background';
import { TextField } from '@/components/ui/text-field';
import {
  accountErrorMessage,
  changePassword,
  closeAllSessions,
  deleteAccount,
  loadAccount,
  passwordErrorMessage,
  sessionErrorMessage,
  updateAccount,
  type Account,
} from '@/features/auth/account-api';
import { ApiError } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, radius, spacing, typography } from '@/theme';

const DANGER = '#F99799';

const MIN_PASSWORD = 8;

const MAX_PASSWORD = 72;

const GLOWS = [
  { left: '84%', top: '14%' },
  { left: '8%', top: '42%' },
  { left: '80%', top: '72%' },
] as const;

const LOCK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 16c0-2.828 0-4.243.879-5.121C3.757 10 5.172 10 8 10h8c2.828 0 4.243 0 5.121.879C22 11.757 22 13.172 22 16s0 4.243-.879 5.121C20.243 22 18.828 22 16 22H8c-2.828 0-4.243 0-5.121-.879C2 20.243 2 18.828 2 16Z"/><path stroke-linecap="round" d="M6 10V8a6 6 0 1 1 12 0v2"/></g></svg>';

const KEY_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><circle cx="8" cy="15" r="4"/><path d="M10.85 12.15L19 4m-1 1l2 2m-5 0l2 2"/></g></svg>';

const DEVICES_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><rect width="13" height="10" x="2" y="4" rx="2"/><path d="M5 18h7"/><rect width="6" height="11" x="16" y="9" rx="1.5"/><path d="M18.5 17.5h1"/></g></svg>';

const initials = (account: Account) =>
  `${account.firstName.trim().charAt(0)}${account.lastName.trim().charAt(0)}`.toUpperCase();

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  return 'El servidor no pudo cargar tu cuenta. Vuelve a intentarlo en un momento.';
}

type ActionCardProps = { icon: string; title: string; detail: string; onPress: () => void };

function ActionCard({ icon, title, detail, onPress }: ActionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.iconCircle}>
        <SvgXml xml={icon} color={colors.textInverse} width={26} height={26} />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.cardDetail} numberOfLines={2}>
          {detail}
        </Text>
      </View>
    </Pressable>
  );
}

type DangerButtonProps = { label: string; onPress: () => void; disabled?: boolean; loading?: boolean };

function DangerButton({ label, onPress, disabled, loading }: DangerButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.danger, disabled && styles.off, pressed && styles.pressed]}>
      {loading ? <ActivityIndicator color={DANGER} /> : <Text style={styles.dangerLabel}>{label}</Text>}
    </Pressable>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.sectionTitle} accessibilityRole="header">
      {children}
    </Text>
  );
}

type PasswordSheetProps = { visible: boolean; onClose: () => void; onDone: () => void };

function PasswordSheet({ visible, onClose, onDone }: PasswordSheetProps) {
  const [shown, setShown] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (visible !== shown) {
    setShown(visible);
    if (visible) {
      setCurrent('');
      setNext('');
      setRepeat('');
      setError(null);
    }
  }

  const lengthOk = next.length >= MIN_PASSWORD && next.length <= MAX_PASSWORD;
  const problem =
    next !== '' && !lengthOk
      ? `La nueva contraseña debe tener entre ${MIN_PASSWORD} y ${MAX_PASSWORD} caracteres.`
      : repeat !== '' && repeat !== next
        ? 'Las contraseñas nuevas no coinciden.'
        : null;
  const complete = current !== '' && lengthOk && repeat === next;
  const message = error ?? problem;

  const save = async () => {
    if (!complete || saving) return;
    setSaving(true);
    setError(null);
    try {
      await changePassword(current, next);
      onClose();
      onDone();
    } catch (reason) {
      setError(passwordErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} title="Cambiar contraseña" onClose={onClose}>
      <TextField
        label="Contraseña actual"
        value={current}
        onChangeText={value => {
          setCurrent(value);
          setError(null);
        }}
        secure
        autoCapitalize="none"
        autoComplete="current-password"
        maxLength={MAX_PASSWORD}
      />
      <TextField
        label="Nueva contraseña"
        value={next}
        onChangeText={value => {
          setNext(value);
          setError(null);
        }}
        secure
        autoCapitalize="none"
        autoComplete="new-password"
        maxLength={MAX_PASSWORD}
      />
      <TextField
        label="Repite la nueva"
        value={repeat}
        onChangeText={value => {
          setRepeat(value);
          setError(null);
        }}
        secure
        autoCapitalize="none"
        autoComplete="new-password"
        maxLength={MAX_PASSWORD}
      />
      <Text style={[styles.hint, message && styles.hintError]} accessibilityLiveRegion="polite">
        {message ?? `Entre ${MIN_PASSWORD} y ${MAX_PASSWORD} caracteres. Se cerrarán tus otras sesiones.`}
      </Text>
      <Button label="Guardar" onPress={save} loading={saving} disabled={!complete} />
    </BottomSheet>
  );
}

type DeleteSheetProps = { visible: boolean; nickname: string; onClose: () => void };

function DeleteSheet({ visible, nickname, onClose }: DeleteSheetProps) {
  const [shown, setShown] = useState(false);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (visible !== shown) {
    setShown(visible);
    if (visible) {
      setTyped('');
      setError(null);
    }
  }

  const matches = typed.trim().toLowerCase() === nickname.toLowerCase();

  const remove = async () => {
    if (!matches || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
    } catch (reason) {
      setError(sessionErrorMessage(reason));
      setDeleting(false);
    }
  };

  return (
    <BottomSheet visible={visible} title="Eliminar cuenta" onClose={onClose}>
      <Text style={styles.hint}>
        Se eliminarán tus billeteras, operaciones, deudas y repeticiones, y se cerrarán todas tus sesiones. No podrás
        recuperarla desde la app.
      </Text>
      <TextField
        label={`Escribe ${nickname} para confirmar`}
        value={typed}
        onChangeText={value => {
          setTyped(value);
          setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error && (
        <Text style={[styles.hint, styles.hintError]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      <DangerButton label="Eliminar mi cuenta" onPress={remove} disabled={!matches} loading={deleting} />
      <Pressable accessibilityRole="button" hitSlop={8} onPress={onClose} style={styles.cancel}>
        <Text style={styles.cancelLabel}>Cancelar</Text>
      </Pressable>
    </BottomSheet>
  );
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { data: account, error: loadError, retry, refresh } = useApiData(loadAccount);
  const [loaded, setLoaded] = useState<Account | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'password' | 'delete' | null>(null);

  if (account && account !== loaded) {
    setLoaded(account);
    setFirstName(account.firstName);
    setLastName(account.lastName);
    setNickname(account.nickname);
  }

  const changes = { firstName: firstName.trim(), lastName: lastName.trim(), nickname: nickname.trim() };
  const dirty =
    !!account &&
    (changes.firstName !== account.firstName ||
      changes.lastName !== account.lastName ||
      changes.nickname !== account.nickname);
  const complete = changes.firstName !== '' && changes.lastName !== '' && changes.nickname !== '';

  const edit = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setError(null);
    setNotice(null);
  };

  const save = async () => {
    if (!dirty || !complete || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await updateAccount(changes);
      setNotice('Datos actualizados.');
      refresh();
    } catch (reason) {
      setError(accountErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  const signOutEverywhere = () => {
    showConfirm({
      title: 'Cerrar todas las sesiones',
      message: 'Se cerrará la sesión en todos tus dispositivos, también en este.',
      confirmLabel: 'Cerrar sesiones',
      onConfirm: async () => {
        setError(null);
        try {
          await closeAllSessions();
        } catch (reason) {
          setError(sessionErrorMessage(reason));
        }
      },
    });
  };

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + spacing.xxl }]}>
        <BackHeader title="Mi cuenta" />
        {!account ? (
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
          <>
            <View
              style={styles.profile}
              accessible
              accessibilityLabel={`${account.firstName} ${account.lastName}, usuario ${account.nickname}, moneda principal ${account.currency.code}, no se puede cambiar`}>
              <View style={styles.initials}>
                <Text style={styles.initialsLabel}>{initials(account)}</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {account.firstName} {account.lastName}
                </Text>
                <Text style={styles.cardDetail} numberOfLines={1}>
                  @{account.nickname}
                </Text>
                <View style={styles.currencyRow}>
                  <SvgXml xml={LOCK_ICON} color={colors.textMuted} width={12} height={12} />
                  <Text style={styles.cardDetail} numberOfLines={1}>
                    {account.currency.code} · {account.currency.currency}
                  </Text>
                </View>
              </View>
            </View>
            <SectionTitle>Datos personales</SectionTitle>
            <View style={styles.form}>
              <TextField label="Nombre" value={firstName} onChangeText={edit(setFirstName)} maxLength={60} />
              <TextField label="Apellidos" value={lastName} onChangeText={edit(setLastName)} maxLength={60} />
              <TextField
                label="Nombre de usuario"
                value={nickname}
                onChangeText={edit(setNickname)}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={40}
              />
              {(error || notice) && (
                <Text style={[styles.message, error && styles.hintError]} accessibilityLiveRegion="polite">
                  {error ?? notice}
                </Text>
              )}
              <Button label="Guardar cambios" onPress={save} loading={saving} disabled={!dirty || !complete} />
            </View>
            <SectionTitle>Seguridad</SectionTitle>
            <View style={styles.list}>
              <ActionCard
                icon={KEY_ICON}
                title="Cambiar contraseña"
                detail="Se cerrarán tus otras sesiones"
                onPress={() => setSheet('password')}
              />
              <ActionCard
                icon={DEVICES_ICON}
                title="Cerrar todas las sesiones"
                detail="En todos tus dispositivos, también este"
                onPress={signOutEverywhere}
              />
            </View>
            <View style={styles.deleteAction}>
              <DangerButton label="Eliminar cuenta" onPress={() => setSheet('delete')} />
            </View>
          </>
        )}
      </ScrollView>
      <PasswordSheet
        visible={sheet === 'password'}
        onClose={() => setSheet(null)}
        onDone={() => setNotice('Contraseña actualizada. Se cerraron tus otras sesiones.')}
      />
      {account && <DeleteSheet visible={sheet === 'delete'} nickname={account.nickname} onClose={() => setSheet(null)} />}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    gap: 15,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  profile: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 17,
  },
  initials: {
    width: 54,
    height: 54,
    borderRadius: radius.full,
    backgroundColor: colors.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsLabel: { ...typography.titleSection, color: colors.textOnBrand },
  currencyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionTitle: {
    ...typography.bodyMedium,
    fontFamily: typography.titleSection.fontFamily,
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  form: { gap: 12 },
  list: { gap: 12 },
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
    backgroundColor: colors.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, gap: 4 },
  cardTitle: { ...typography.bodyMedium, fontFamily: typography.titleSection.fontFamily, fontSize: 16, color: colors.textPrimary },
  cardDetail: { ...typography.caption, fontSize: 12, lineHeight: 16, color: colors.textMuted },
  deleteAction: { marginTop: spacing.lg },
  danger: {
    minHeight: 50,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: DANGER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerLabel: { ...typography.buttonLabel, color: DANGER },
  off: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
  cancel: { alignSelf: 'center', paddingVertical: spacing.xs },
  cancelLabel: { ...typography.bodyMedium, color: colors.textSecondary },
  hint: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary },
  hintError: { color: colors.error },
  message: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
  state: { paddingVertical: spacing.xxl, justifyContent: 'center', gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
});
