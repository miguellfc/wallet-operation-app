import { CryptoDigestAlgorithm, digestStringAsync, getRandomBytes } from 'expo-crypto';

import { deleteSecure, readSecure, writeSecure } from '@/lib/secure-storage';

export const PIN_LENGTH = 4;

const PIN_KEY = 'local-pin';

const BIOMETRICS_KEY = 'local-biometrics';

type StoredPin = { salt: string; hash: string };

const toHex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

const hashPin = (salt: string, pin: string) => digestStringAsync(CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);

async function readPin() {
  const stored = await readSecure(PIN_KEY);
  return stored ? (JSON.parse(stored) as StoredPin) : null;
}

export async function hasPin() {
  return (await readPin()) !== null;
}

export async function savePin(pin: string) {
  const salt = toHex(getRandomBytes(16));
  const stored: StoredPin = { salt, hash: await hashPin(salt, pin) };
  await writeSecure(PIN_KEY, JSON.stringify(stored));
}

export async function verifyPin(pin: string) {
  const stored = await readPin();
  if (!stored) return false;
  return (await hashPin(stored.salt, pin)) === stored.hash;
}

export async function isBiometricsEnabled() {
  return (await readSecure(BIOMETRICS_KEY)) === '1';
}

export async function setBiometricsEnabled(enabled: boolean) {
  if (enabled) await writeSecure(BIOMETRICS_KEY, '1');
  else await deleteSecure(BIOMETRICS_KEY);
}

export async function clearPin() {
  await Promise.all([deleteSecure(PIN_KEY), deleteSecure(BIOMETRICS_KEY)]);
}
