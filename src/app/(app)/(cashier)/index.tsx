import { RoleGuard } from '@/components/role-guard';
import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function CashierHome() {
  return (
    <RoleGuard roles={['cashier']}>
      <PlaceholderScreen
        badge="Cashier"
        title="Check-in"
        description="P0 skeleton. Plate lookup, service presets, and the 3-tap check-in flow land in P3."
      />
    </RoleGuard>
  );
}
