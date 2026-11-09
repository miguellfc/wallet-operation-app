import { InfoRow } from '@/components/ui/info-row';
import type { Operation } from '@/features/operations/operations-api';
import { formatAmount, timeLabel } from '@/lib/format';
import { colors } from '@/theme';

const KIND = {
  INCOME: { sign: '+', label: 'Ingreso', color: colors.income, background: colors.categoryIconIncome },
  OPENING: { sign: '+', label: 'Saldo inicial', color: colors.income, background: colors.categoryIconIncome },
  EXPENSE: { sign: '-', label: 'Gasto', color: colors.expense, background: colors.categoryIcon },
  TRANSFER: { sign: '', label: 'Transferencia', color: colors.brand, background: colors.incomeSoft },
} as const;

function describe(operation: Operation) {
  const kind = KIND[operation.type];
  const { from, to } = operation.wallets;
  if (operation.type === 'TRANSFER') {
    return { title: operation.description || kind.label, icon: 'Transferencia', detail: `${from?.name ?? ''} → ${to?.name ?? ''}` };
  }
  const category = operation.category?.name ?? kind.label;
  const wallet = (operation.type === 'EXPENSE' ? from : to)?.name;
  return {
    title: operation.description || category,
    icon: operation.type === 'OPENING' ? 'Saldo inicial' : category,
    detail: wallet ? `${category} · ${wallet}` : category,
  };
}

export function walletAmount({ type, amount }: Pick<Operation, 'type' | 'amount'>) {
  const side = type === 'INCOME' || type === 'OPENING' ? amount.to : amount.from;
  return side ?? amount.user;
}

export function operationSign(type: Operation['type']) {
  return KIND[type].sign;
}

export function OperationRow({ operation }: { operation: Operation }) {
  const kind = KIND[operation.type];
  const { title, icon, detail } = describe(operation);
  const { amount: value, currency } = walletAmount(operation);
  const amount = formatAmount(value, currency, kind.sign);
  const time = timeLabel(operation.date);

  return (
    <InfoRow
      icon={icon}
      iconColor={kind.color}
      iconBackground={kind.background}
      title={title}
      detail={detail}
      amount={amount}
      caption={time}
      accessibilityLabel={`${title}, ${kind.label}, ${amount}, ${time}, ${detail}`}
    />
  );
}
