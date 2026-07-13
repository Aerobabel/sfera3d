import { SupplierDashboard } from '@/components/dashboards/RoleDashboards';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function BusinessDashboardPage() {
    return <main className="sfera-cinematic-shell min-h-screen p-4 md:p-8"><div className="mx-auto max-w-7xl"><SupplierDashboard /></div></main>;
}
