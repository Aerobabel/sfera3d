import { ShopperDashboard } from '@/components/dashboards/RoleDashboards';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ShopperDashboardPage() {
    return <main className="sfera-cinematic-shell min-h-screen p-0 md:p-8"><div className="mx-auto max-w-7xl"><ShopperDashboard /></div></main>;
}
