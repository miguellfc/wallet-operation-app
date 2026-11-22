import { ComingSoon } from '@/components/ui/coming-soon';
import { useThemeName } from '@/features/theme/theme-store';

export default function StatisticsScreen() {
  useThemeName();
  return <ComingSoon title="Estadística" />;
}
