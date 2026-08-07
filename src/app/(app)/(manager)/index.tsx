import { RoleGuard } from '@/components/role-guard';
import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function ManagerHome() {
  return (
    <RoleGuard roles={['manager', 'admin']}>
      <PlaceholderScreen
        badge="Manager"
        title="Day Overview"
        description="P0 skeleton. Queue overview, day-close, conflict review, and reconciliation land in P9."
      />
    </RoleGuard>
  );
}
