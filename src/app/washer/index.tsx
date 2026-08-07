import { PlaceholderScreen } from '@/components/placeholder-screen';
import { RoleGuard } from '@/components/role-guard';

export default function WasherHome() {
  return (
    <RoleGuard roles={['washer', 'manager', 'admin']}>
      <PlaceholderScreen
        badge="Washer"
        title="Job Queue"
        description="P0 skeleton. Claim Next, assignments, and job status flow land in P4."
      />
    </RoleGuard>
  );
}
