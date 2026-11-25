import { Text, View } from 'react-native';

import { OperationRow } from '@/components/operations/operation-row';
import { Reveal } from '@/components/ui/reveal';
import type { Operation } from '@/features/operations/operations-api';
import { utcDateLabel } from '@/lib/format';
import { colors, spacing, themedStyles, typography } from '@/theme';

type OperationDayListProps = { operations: Operation[]; onPress: (operation: Operation) => void };

const dayOf = (iso: string) => iso.slice(0, 10);

const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function headerLabel(day: string) {
  const now = new Date();
  if (day === localDay(now)) return 'Hoy';
  if (day === localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) return 'Ayer';
  return utcDateLabel(`${day}T00:00:00.000Z`);
}

export function groupByDay(operations: Operation[]) {
  const groups: { day: string; operations: Operation[] }[] = [];
  for (const operation of operations) {
    const day = dayOf(operation.date);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.operations.push(operation);
    else groups.push({ day, operations: [operation] });
  }
  return groups;
}

export function OperationDayHeader({ day }: { day: string }) {
  return (
    <Text style={styles.header} accessibilityRole="header">
      {headerLabel(day)}
    </Text>
  );
}

export function OperationDayList({ operations, onPress }: OperationDayListProps) {
  return (
    <View style={styles.list}>
      {groupByDay(operations).map(group => (
        <View key={group.day} style={styles.group}>
          <OperationDayHeader day={group.day} />
          {group.operations.map((operation, index) => (
            <Reveal key={operation._id} index={index}>
              <OperationRow operation={operation} onPress={() => onPress(operation)} />
            </Reveal>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = themedStyles(() => ({
  list: { gap: spacing.lg },
  group: { gap: spacing.sm },
  header: { ...typography.labelOverline, color: colors.textMuted, marginTop: spacing.xs },
}));
