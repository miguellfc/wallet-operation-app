import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import { startActivityAsync } from 'expo-intent-launcher';
import { Linking } from 'react-native';

import { dataSource } from '@/lib/data-source';

const LATEST_RELEASE_URL = 'https://api.github.com/repos/miguellfc/wallet-operation-app/releases/latest';

const APK_MIME_TYPE = 'application/vnd.android.package-archive';

const VIEW_ACTION = 'android.intent.action.VIEW';

const FLAG_GRANT_READ_URI_PERMISSION = 1;

const isAndroid = process.env.EXPO_OS === 'android';

export const currentVersion = Constants.expoConfig?.version ?? '0.0.0';

export type Release = {
  version: string;
  notes: string;
  apkUrl: string | null;
  size: number;
};

type GithubAsset = { name: string; browser_download_url: string; size: number };

type GithubRelease = { tag_name: string; body: string | null; assets: GithubAsset[] };

export class UpdateDownloadError extends Error {}

const versionParts = (version: string) =>
  version
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .map(part => Number.parseInt(part, 10) || 0);

export function isNewerVersion(candidate: string, current = currentVersion) {
  const next = versionParts(candidate);
  const installed = versionParts(current);
  for (let index = 0; index < Math.max(next.length, installed.length); index++) {
    const difference = (next[index] ?? 0) - (installed[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return false;
}

const isVariantApk = (asset: GithubAsset) => {
  const name = asset.name.toLowerCase();
  return name.endsWith('.apk') && name.includes(dataSource);
};

export async function fetchLatestRelease(): Promise<Release | null> {
  const response = await fetch(LATEST_RELEASE_URL, { headers: { Accept: 'application/vnd.github+json' } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
  const release = (await response.json()) as GithubRelease;
  const apk = release.assets.find(isVariantApk);
  return {
    version: release.tag_name.trim().replace(/^v/i, ''),
    notes: release.body?.trim() ?? '',
    apkUrl: apk?.browser_download_url ?? null,
    size: apk?.size ?? 0,
  };
}

export function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export async function installRelease(release: Release, onProgress: (fraction: number) => void) {
  if (!release.apkUrl) return;
  if (!isAndroid) {
    await Linking.openURL(release.apkUrl);
    return;
  }
  const destination = new File(Paths.cache, `cashen-${dataSource}-${release.version}.apk`);
  let apk: File;
  try {
    apk = await File.downloadFileAsync(release.apkUrl, destination, {
      idempotent: true,
      onProgress: ({ bytesWritten, totalBytes }) => {
        if (totalBytes > 0) onProgress(bytesWritten / totalBytes);
      },
    });
  } catch (reason) {
    throw new UpdateDownloadError(String(reason));
  }
  const contentUri = await getContentUriAsync(apk.uri);
  await startActivityAsync(VIEW_ACTION, { data: contentUri, type: APK_MIME_TYPE, flags: FLAG_GRANT_READ_URI_PERMISSION });
}

export function updateErrorMessage(error: unknown) {
  if (error instanceof UpdateDownloadError) return 'No se pudo descargar la actualización. Revisa tu conexión.';
  return 'No se pudo abrir el instalador. Vuelve a intentarlo.';
}
