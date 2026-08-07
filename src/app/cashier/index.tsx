import { PlaceholderScreen } from '@/components/placeholder-screen';
import { RoleGuard } from '@/components/role-guard';
import { SessionHeader } from '@/components/session-header';

export default function CashierHome() {
  return (
    <RoleGuard roles={['cashier', 'manager', 'admin']}>
      <PlaceholderScreen
        badge="Cashier"
        title="Check-in"
        description="P0 skeleton. Plate lookup, service presets, and the 3-tap check-in flow land in P3."
        header={<SessionHeader />}
      />
    </RoleGuard>
  );
}
