import { GamerDashboard } from '@/components/dashboards/RoleDashboards';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function PlayerDashboardPage() {
    return (
        <main className="min-h-screen bg-[#020711] p-0 md:p-4">
            <GamerDashboard />
        </main>
    );
}
