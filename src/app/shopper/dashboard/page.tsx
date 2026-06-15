import { ShopperDashboard } from '@/components/dashboards/RoleDashboards';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ShopperDashboardPage() {
    return <main className="min-h-screen bg-slate-950 p-4 md:p-8"><div className="mx-auto max-w-7xl"><ShopperDashboard /></div></main>;
}
