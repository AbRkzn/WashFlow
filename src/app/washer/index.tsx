import { PlaceholderScreen } from '@/components/placeholder-screen';
import { RoleGuard } from '@/components/role-guard';
import { SessionHeader } from '@/components/session-header';

export default function WasherHome() {
  return (
    <RoleGuard roles={['washer', 'manager', 'admin']}>
      <PlaceholderScreen
        badge="Washer"
        title="Job Queue"
        description="P0 skeleton. Claim Next, assignments, and job status flow land in P4."
        header={<SessionHeader />}
      />
    </RoleGuard>
  );
}
