import { PlaceholderScreen } from '@/components/placeholder-screen';
import { RoleGuard } from '@/components/role-guard';

export default function AdminHome() {
  return (
    <RoleGuard roles={['admin']}>
      <PlaceholderScreen
        badge="Admin"
        title="Settings"
        description="P0 skeleton. User management, inventory, service presets, and config land in P2/P7."
      />
    </RoleGuard>
  );
}
