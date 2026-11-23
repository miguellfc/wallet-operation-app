import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { migrate } from './migrations';

const DATABASE_NAME = 'cashen.db';

let opening: Promise<SQLiteDatabase> | null = null;

async function open() {
  const db = await openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await migrate(db);
  return db;
}

export function getDatabase() {
  opening ??= open().catch(error => {
    opening = null;
    throw error;
  });
  return opening;
}
