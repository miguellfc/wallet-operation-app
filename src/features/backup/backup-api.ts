import { getDocumentAsync } from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';

import { restoreLocalProfile } from '@/features/auth/local-profile';
import { exportBackup, importBackup, InvalidBackupError, parseBackup } from '@/lib/local-db/backup';
import { runDueRecurrences } from '@/lib/local-db/recurrences';

const isWeb = process.env.EXPO_OS === 'web';

const MIME_TYPE = 'application/json';

const backupFileName = () => `cashen-${new Date().toISOString().slice(0, 10)}.json`;

function downloadOnWeb(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: MIME_TYPE }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportData() {
  const content = await exportBackup();
  const name = backupFileName();
  if (isWeb) {
    downloadOnWeb(name, content);
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(content);
  await shareAsync(file.uri, { mimeType: MIME_TYPE, dialogTitle: 'Copia de seguridad de Cashen', UTI: 'public.json' });
}

export async function pickBackup() {
  const result = await getDocumentAsync({ type: [MIME_TYPE, 'text/plain'], copyToCacheDirectory: true, base64: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const content = isWeb && asset.file ? await asset.file.text() : await new File(asset.uri).text();
  parseBackup(content);
  return content;
}

export async function importData(content: string) {
  await importBackup(content);
  await restoreLocalProfile();
  await runDueRecurrences().catch(() => 0);
}

export function backupErrorMessage(error: unknown) {
  if (error instanceof InvalidBackupError) return 'El archivo no es una copia de seguridad válida de Cashen.';
  return 'No se pudo completar la acción. Vuelve a intentarlo.';
}
