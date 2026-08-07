import { PlaceholderScreen } from '@/components/placeholder-screen';
import { RoleGuard } from '@/components/role-guard';
import { SessionHeader } from '@/components/session-header';

export default function AdminHome() {
  return (
    <RoleGuard roles={['admin']}>
      <PlaceholderScreen
        badge="Admin"
        title="Settings"
        description="P0 skeleton. User management, inventory, service presets, and config land in P2/P7."
        header={<SessionHeader />}
      />
    </RoleGuard>
  );
}
