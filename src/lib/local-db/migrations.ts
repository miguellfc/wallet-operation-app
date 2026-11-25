import type { SQLiteDatabase } from 'expo-sqlite';

type Migration = { version: number; sql: string };

const currencyColumns = (prefix: string, required = true) => {
  const constraint = required ? ' NOT NULL' : '';
  return `
    ${prefix}_code TEXT${constraint},
    ${prefix}_name TEXT${constraint},
    ${prefix}_symbol TEXT${constraint},
    ${prefix}_type TEXT${constraint} CHECK (${prefix}_type IN ('FIAT', 'CRYPTO'))`;
};

const auditColumns = `
    deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL`;

const operationWalletColumns = (side: 'from' | 'to') => `
    wallet_${side}_id TEXT REFERENCES wallets (id),
    wallet_${side}_name TEXT,
    wallet_${side}_excluded INTEGER,
    ${currencyColumns(`wallet_${side}_currency`, false)},
    amount_${side}_currency TEXT,
    amount_${side}_amount REAL`;

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
  CREATE TABLE profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    ${currencyColumns('currency')},
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE wallets (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('GENERAL', 'CREDIT_CARD')),
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    excluded INTEGER NOT NULL DEFAULT 0,
    ${currencyColumns('currency')},
    init_amount REAL NOT NULL DEFAULT 0,
    ${auditColumns}
  );

  CREATE TABLE categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    color TEXT NOT NULL,
    icon TEXT,
    system INTEGER NOT NULL DEFAULT 0,
    ${auditColumns}
  );

  CREATE INDEX categories_type_system ON categories (deleted, system, type);

  CREATE TABLE exchange_rates (
    id TEXT PRIMARY KEY NOT NULL,
    ${currencyColumns('currency')},
    exchange_rate REAL NOT NULL,
    target_currency TEXT NOT NULL,
    ${auditColumns}
  );

  CREATE UNIQUE INDEX exchange_rates_unique ON exchange_rates (target_currency, currency_code) WHERE deleted = 0;

  CREATE TABLE debts (
    id TEXT PRIMARY KEY NOT NULL,
    person TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('LENT', 'BORROWED')),
    amount REAL NOT NULL,
    pending REAL NOT NULL,
    ${currencyColumns('currency')},
    wallet_id TEXT NOT NULL REFERENCES wallets (id),
    wallet_name TEXT NOT NULL,
    date TEXT NOT NULL,
    color TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID')),
    ${auditColumns}
  );

  CREATE INDEX debts_status_date ON debts (deleted, status, date);

  CREATE TABLE operations (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER', 'OPENING')),
    date TEXT NOT NULL,
    description TEXT,
    ${operationWalletColumns('from')},
    ${operationWalletColumns('to')},
    amount_user_currency TEXT NOT NULL,
    amount_user_amount REAL NOT NULL,
    amount_user_rate_from REAL,
    amount_user_rate_to REAL,
    category_id TEXT REFERENCES categories (id),
    category_name TEXT,
    category_color TEXT,
    category_icon TEXT,
    debt_id TEXT REFERENCES debts (id),
    debt_action TEXT CHECK (debt_action IN ('OPENING', 'PAYMENT', 'INCREASE')),
    debt_amount REAL,
    adjustment INTEGER NOT NULL DEFAULT 0,
    ${auditColumns},
    CHECK (type NOT IN ('INCOME', 'EXPENSE') OR category_id IS NOT NULL)
  );

  CREATE INDEX operations_date ON operations (deleted, date DESC);
  CREATE INDEX operations_wallet_from ON operations (wallet_from_id, date);
  CREATE INDEX operations_wallet_to ON operations (wallet_to_id, date);
  CREATE INDEX operations_category ON operations (category_id);
  CREATE INDEX operations_debt ON operations (debt_id);

  CREATE TABLE recurrences (
    id TEXT PRIMARY KEY NOT NULL,
    recurrence TEXT NOT NULL CHECK (recurrence IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
    delay INTEGER NOT NULL DEFAULT 1,
    end_type TEXT NOT NULL DEFAULT 'FOREVER' CHECK (end_type IN ('FOREVER', 'TIMES', 'UNTIL')),
    end_times INTEGER,
    end_times_executed INTEGER NOT NULL DEFAULT 0,
    end_until TEXT,
    days_of_week TEXT,
    same_month_day INTEGER,
    last_month_day INTEGER,
    start_date TEXT NOT NULL,
    last_execution TEXT NOT NULL,
    next_execution TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    ${auditColumns}
  );

  CREATE INDEX recurrences_pending ON recurrences (completed, deleted, next_execution);

  CREATE TABLE recurrence_operations (
    recurrence_id TEXT NOT NULL REFERENCES recurrences (id) ON DELETE CASCADE,
    operation_id TEXT NOT NULL REFERENCES operations (id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    PRIMARY KEY (recurrence_id, operation_id)
  );

  CREATE INDEX recurrence_operations_operation ON recurrence_operations (operation_id);
`,
  },
];

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL);',
  );
  const row = await db.getFirstAsync<{ version: number | null }>('SELECT MAX(version) AS version FROM schema_version');
  const current = row?.version ?? 0;
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      await db.runAsync('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)', [
        migration.version,
        new Date().toISOString(),
      ]);
    });
  }
}
