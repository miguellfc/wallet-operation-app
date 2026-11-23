import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useState, type ReactNode } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinPad } from '@/components/lock/pin-pad';
import { Button } from '@/components/ui/button';
import { showConfirm } from '@/components/ui/confirm-dialog';
import { ScreenBackground } from '@/components/ui/screen-background';
import { useLocalProfile } from '@/features/auth/local-profile';
import {
  authenticateWithBiometrics,
  availableBiometric,
  biometricLabel,
  type BiometricKind,
} from '@/features/lock/biometrics';
import { completePinSetup, resetLocalData, unlock, useLockState } from '@/features/lock/lock-store';
import { isBiometricsEnabled, PIN_LENGTH, savePin, setBiometricsEnabled, verifyPin } from '@/features/lock/pin';
import { colors, fonts, layout, spacing, themedStyles, typography } from '@/theme';

const GLOWS = [
  { left: '82%', top: '22%' },
  { left: '8%', top: '58%' },
  { left: '90%', top: '84%' },
] as const;

const LOCK_OUT = FadeOut.duration(200);

const MAX_ATTEMPTS = 5;

const WAIT_SECONDS = 30;

type LockFrameProps = { title: string; message: string | null; error?: boolean; children: ReactNode };

function LockFrame({ title, message, error = false, children }: LockFrameProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  return (
    <Animated.View exiting={LOCK_OUT} style={styles.overlay} accessibilityViewIsModal>
      <ScreenBackground glows={[...GLOWS]}>
        <View style={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + spacing.xxl }]}>
          <View style={styles.hero}>
            <Image contentFit="contain" source={require('@/assets/icons/logo.svg')} style={styles.logo} />
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <Text style={[styles.message, error && styles.error]} accessibilityLiveRegion="polite">
              {message ?? ' '}
            </Text>
          </View>
          {children}
        </View>
      </ScreenBackground>
    </Animated.View>
  );
}

function PinSetup() {
  const [mismatches, setMismatches] = useState(0);
  const [first, setFirst] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [offer, setOffer] = useState<BiometricKind | null>(null);
  const [enabling, setEnabling] = useState(false);

  const finishPin = async (pin: string) => {
    setSaving(true);
    try {
      await savePin(pin);
      const kind = await availableBiometric();
      if (kind) setOffer(kind);
      else completePinSetup();
    } catch {
      setError('No se pudo guardar el PIN. Inténtalo de nuevo');
      setFirst(null);
      setValue('');
      setSaving(false);
    }
  };

  const change = (next: string) => {
    setValue(next);
    setError(null);
    if (next.length < PIN_LENGTH) return;
    if (first === null) {
      setFirst(next);
      setValue('');
      return;
    }
    if (next !== first) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => null);
      setMismatches(count => count + 1);
      setError('Los PIN no coinciden. Vuelve a crearlo');
      setFirst(null);
      setValue('');
      return;
    }
    finishPin(next);
  };

  if (offer) {
    const label = biometricLabel(offer);
    const enable = async () => {
      setEnabling(true);
      if (await authenticateWithBiometrics()) await setBiometricsEnabled(true).catch(() => null);
      completePinSetup();
    };
    return (
      <LockFrame
        title={offer === 'face' ? '¿Usar tu cara?' : '¿Usar tu huella?'}
        message={`Desbloquea Cashen más rápido con tu ${label}. Siempre podrás usar el PIN.`}>
        <View style={styles.actions}>
          <Button label={`Activar ${label}`} onPress={enable} loading={enabling} />
          <Pressable accessibilityRole="button" onPress={completePinSetup} disabled={enabling} style={styles.link}>
            <Text style={styles.linkLabel}>Ahora no</Text>
          </Pressable>
        </View>
      </LockFrame>
    );
  }

  return (
    <LockFrame
      title={first === null ? 'Crea tu PIN' : 'Confirma tu PIN'}
      message={error ?? (first === null ? `Elige ${PIN_LENGTH} dígitos para proteger tus datos` : 'Vuelve a introducirlo')}
      error={!!error}>
      <PinPad length={PIN_LENGTH} value={value} onChange={change} disabled={saving} shake={mismatches} />
      <View style={styles.footer} />
    </LockFrame>
  );
}

function confirmForgotPin() {
  showConfirm({
    title: '¿Olvidaste el PIN?',
    message:
      'Se borrarán todos tus datos de este dispositivo y volverás a empezar. Esta acción no se puede deshacer.',
    confirmLabel: 'Borrar datos',
    onConfirm: () => {
      resetLocalData().catch(() => null);
    },
  });
}

function PinUnlock() {
  const [shake, setShake] = useState(0);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [biometric, setBiometric] = useState<BiometricKind | null>(null);

  const tryBiometrics = async () => {
    if (await authenticateWithBiometrics()) unlock();
  };

  useEffect(() => {
    let active = true;
    (async () => {
      if (!(await isBiometricsEnabled())) return;
      const kind = await availableBiometric();
      if (!active || !kind) return;
      setBiometric(kind);
      if (await authenticateWithBiometrics()) unlock();
    })().catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => {
      setWaiting(false);
      setAttempts(0);
      setError(null);
    }, WAIT_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [waiting]);

  const check = async (pin: string) => {
    setChecking(true);
    const valid = await verifyPin(pin).catch(() => false);
    setChecking(false);
    if (valid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
      unlock();
      return;
    }
    const failed = attempts + 1;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => null);
    setShake(count => count + 1);
    setAttempts(failed);
    setValue('');
    if (failed >= MAX_ATTEMPTS) {
      setWaiting(true);
      setError(`Demasiados intentos. Espera ${WAIT_SECONDS} segundos`);
    } else {
      setError('PIN incorrecto');
    }
  };

  const change = (next: string) => {
    setValue(next);
    if (next.length > 0 && !waiting) setError(null);
    if (next.length === PIN_LENGTH) check(next);
  };

  return (
    <LockFrame title="Introduce tu PIN" message={error} error={!!error}>
      <PinPad
        length={PIN_LENGTH}
        value={value}
        onChange={change}
        disabled={checking || waiting}
        biometric={biometric}
        onBiometric={tryBiometrics}
        shake={shake}
      />
      <Pressable accessibilityRole="button" onPress={confirmForgotPin} style={[styles.link, styles.footer]}>
        <Text style={styles.linkLabel}>¿Olvidaste el PIN?</Text>
      </Pressable>
    </LockFrame>
  );
}

export function AppLock() {
  const profile = useLocalProfile();
  const { pinSet, locked } = useLockState();
  if (!profile) return null;
  if (!pinSet) return <PinSetup />;
  if (locked) return <PinUnlock />;
  return null;
}

const styles = themedStyles(() => ({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.bgApp },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  hero: { alignItems: 'center', gap: spacing.lg },
  logo: { width: 62, height: 40 },
  title: { ...typography.titleStat, fontSize: 26, lineHeight: 32, color: colors.textPrimary, textAlign: 'center' },
  message: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center', minHeight: 44 },
  error: { color: colors.error },
  actions: { alignSelf: 'stretch', gap: spacing.md },
  footer: { minHeight: layout.minTouchTarget },
  link: { alignSelf: 'center', minHeight: layout.minTouchTarget, justifyContent: 'center', paddingHorizontal: spacing.sm },
  linkLabel: { ...typography.bodyMedium, fontFamily: fonts.semiBold, color: colors.brand },
}));
