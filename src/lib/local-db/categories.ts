import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category, CategoryInput, CategoryType } from '@/features/categories/categories-api';

import { getDatabase } from './database';
import { ADJUSTMENT_CATEGORY_NAME, DEFAULT_CATEGORIES, LOAN_CATEGORY_NAME } from './defaults';
import { newId } from './ids';
import { notFound } from './money';

type CategoryRow = { id: string; name: string; type: CategoryType; color: string; icon: string | null };

const CATEGORY_COLUMNS = 'id, name, type, color, icon';

const toCategory = (row: CategoryRow): Category => ({
  _id: row.id,
  name: row.name,
  type: row.type,
  color: row.color,
  ...(row.icon ? { icon: row.icon } : {}),
});

export async function listCategories(type: CategoryType) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CategoryRow>(
    `SELECT ${CATEGORY_COLUMNS} FROM categories WHERE deleted = 0 AND system = 0 AND type = ? ORDER BY name COLLATE NOCASE`,
    [type],
  );
  return rows.map(toCategory);
}

export async function findCategory(db: SQLiteDatabase, id: string, filter: { type?: CategoryType; system?: boolean } = {}) {
  const row = await db.getFirstAsync<CategoryRow>(
    `SELECT ${CATEGORY_COLUMNS} FROM categories WHERE id = ? AND deleted = 0 AND system = ? AND (? IS NULL OR type = ?)`,
    [id, filter.system ? 1 : 0, filter.type ?? null, filter.type ?? null],
  );
  if (!row) throw notFound();
  return toCategory(row);
}

export async function getCategory(id: string) {
  return findCategory(await getDatabase(), id);
}

export async function createCategory(type: CategoryType, input: CategoryInput) {
  const db = await getDatabase();
  const id = newId();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO categories (id, name, type, color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, input.name, type, input.color, input.icon, now, now],
  );
  return { _id: id };
}

export async function updateCategory(id: string, input: CategoryInput) {
  const db = await getDatabase();
  const result = await db.runAsync(
    'UPDATE categories SET name = ?, color = ?, icon = ?, updated_at = ? WHERE id = ? AND deleted = 0 AND system = 0',
    [input.name, input.color, input.icon, new Date().toISOString(), id],
  );
  if (result.changes === 0) throw notFound();
  return { _id: id };
}

export async function deleteCategory(id: string) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    'UPDATE categories SET deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND deleted = 0 AND system = 0',
    [now, now, id],
  );
  if (result.changes === 0) throw notFound();
}

export async function findOrCreateAdjustmentCategory(db: SQLiteDatabase, type: CategoryType) {
  const existing = await db.getFirstAsync<CategoryRow>(
    `SELECT ${CATEGORY_COLUMNS} FROM categories WHERE deleted = 0 AND system = 1 AND type = ? AND name = ?`,
    [type, ADJUSTMENT_CATEGORY_NAME],
  );
  if (existing) return toCategory(existing);
  const { color } = DEFAULT_CATEGORIES.find(item => item.system && item.type === type && item.name === ADJUSTMENT_CATEGORY_NAME)!;
  const id = newId();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO categories (id, name, type, color, system, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
    [id, ADJUSTMENT_CATEGORY_NAME, type, color, now, now],
  );
  return { _id: id, name: ADJUSTMENT_CATEGORY_NAME, type, color };
}

export async function findLoanCategory(db: SQLiteDatabase, type: CategoryType) {
  const row = await db.getFirstAsync<CategoryRow>(
    `SELECT ${CATEGORY_COLUMNS} FROM categories WHERE deleted = 0 AND system = 1 AND type = ? AND name = ?`,
    [type, LOAN_CATEGORY_NAME],
  );
  return row ? toCategory(row) : null;
}
