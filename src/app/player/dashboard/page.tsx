import { GamerDashboard } from '@/components/dashboards/RoleDashboards';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function PlayerDashboardPage() {
    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,rgba(102,217,203,0.18),transparent_30%),linear-gradient(135deg,#02050b,#08111f_48%,#02050b)] p-4 md:p-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-4 inline-flex rounded-full border border-[#66d9cb]/35 bg-[#66d9cb]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#9ff4ec] shadow-[0_0_40px_rgba(102,217,203,0.16)]">
                    New Arena Command Center · v2
                </div>
                <GamerDashboard />
            </div>
        </main>
    );
}
