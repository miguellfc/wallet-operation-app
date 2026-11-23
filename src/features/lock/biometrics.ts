import {
  authenticateAsync,
  AuthenticationType,
  hasHardwareAsync,
  isEnrolledAsync,
  supportedAuthenticationTypesAsync,
} from 'expo-local-authentication';

export type BiometricKind = 'fingerprint' | 'face';

export async function availableBiometric(): Promise<BiometricKind | null> {
  if (process.env.EXPO_OS === 'web') return null;
  try {
    if (!(await hasHardwareAsync()) || !(await isEnrolledAsync())) return null;
    const types = await supportedAuthenticationTypesAsync();
    const faceOnly =
      types.includes(AuthenticationType.FACIAL_RECOGNITION) && !types.includes(AuthenticationType.FINGERPRINT);
    return faceOnly ? 'face' : 'fingerprint';
  } catch {
    return null;
  }
}

export function biometricLabel(kind: BiometricKind) {
  return kind === 'face' ? 'reconocimiento facial' : 'huella';
}

export async function authenticateWithBiometrics() {
  try {
    const result = await authenticateAsync({
      promptMessage: 'Desbloquea Cashen',
      cancelLabel: 'Usar PIN',
      disableDeviceFallback: true,
    });
    return result.success;
  } catch {
    return false;
  }
}
