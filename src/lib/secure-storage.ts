import * as SecureStore from 'expo-secure-store';

const isWeb = process.env.EXPO_OS === 'web';

const webStorage = () => (typeof localStorage === 'undefined' ? null : localStorage);

export async function readSecure(key: string) {
  if (isWeb) return webStorage()?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

export async function writeSecure(key: string, value: string) {
  if (isWeb) {
    webStorage()?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

export async function deleteSecure(key: string) {
  if (isWeb) {
    webStorage()?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
