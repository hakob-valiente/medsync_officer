import { useState } from 'react';
import {
    Users,
    X, ExternalLink, Info, Activity, Clock, AlertTriangle
} from 'lucide-react';

import { useStore } from '../hooks/useStore';
import { CalendarWidget } from '../components/CalendarWidget';
import { useEffect } from 'react';
import { fetchAndProcessHealthNews } from '../lib/healthService';
import { setAdvisories } from '../store';
import type { HealthAdvisory } from '../types';

// ---- KPI Value Card (3-Second Rule) ----
function KPICard({
    icon: Icon, label, value, accent
}: {
    icon: React.ElementType;
    label: string;
    value: number | string;
    accent: string;
}) {
    const isLowStock = label === 'Low Stock Items';
    
    return (
        <div
            className="kpi-card fade-in"
            style={{ 
                '--kpi-accent': accent,
                padding: '16px 20px',
            } as React.CSSProperties}
        >
            <div className="flex items-center justify-between relative z-10">
                <div>
                    <p className="kpi-label" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{label}</p>
                    <p className="kpi-value" style={{ marginTop: '2px', fontSize: '1.75rem' }}>{value}</p>
                </div>
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: isLowStock ? accent + '14' : 'var(--bg-wash)' }}
                >
                    <Icon 
                        size={20} 
                        style={{ color: isLowStock ? accent : 'var(--text-faint)' }} 
                        strokeWidth={2} 
                    />
                </div>
            </div>
        </div>
    );
}

// ---- Advisory Modal ----
function AdvisoryModal({ advisory, onClose }: { advisory: HealthAdvisory; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
            onClick={onClose}
        >
            <div
                className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto fade-in"
                style={{
                    background: 'var(--card-bg)',
                    boxShadow: 'var(--shadow-xl)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${advisory.riskLevel === 'HIGH' ? 'text-red-600' :
                                    advisory.riskLevel === 'MEDIUM' ? 'text-orange-600' : 'text-blue-600'
                                }`}
                                style={{
                                    background: advisory.riskLevel === 'HIGH' ? 'var(--danger-bg)' :
                                        advisory.riskLevel === 'MEDIUM' ? 'var(--warning-bg)' : 'var(--accent-light)',
                                    color: advisory.riskLevel === 'HIGH' ? 'var(--danger-text)' :
                                        advisory.riskLevel === 'MEDIUM' ? 'var(--warning-text)' : 'var(--accent-deep)'
                                }}
                            >
                                AI {advisory.riskLevel} Priority
                            </span>
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider"
                                style={{ background: 'var(--bg-wash)', color: 'var(--text-muted)' }}
                            >
                                {advisory.category}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{advisory.title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ml-4 group"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-wash)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="rounded-xl p-5" style={{
                        background: advisory.riskLevel === 'HIGH' ? 'var(--danger-bg)' :
                            advisory.riskLevel === 'MEDIUM' ? 'var(--warning-bg)' : 'var(--accent-light)',
                        borderLeft: `4px solid ${advisory.riskLevel === 'HIGH' ? 'var(--danger)' :
                            advisory.riskLevel === 'MEDIUM' ? 'var(--warning)' : 'var(--accent)'}`,
                    }}>
                        <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--text-primary)' }}>{advisory.summary}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {advisory.healthConcerns.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-sm uppercase tracking-wider mb-3 flex items-center gap-2"
                                    style={{ color: 'var(--text-primary)' }}>
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--danger)' }} />
                                    Key Concerns
                                </h3>
                                <ul className="space-y-2">
                                    {advisory.healthConcerns.map((rec, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                            • {rec}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {advisory.preventiveActions.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-sm uppercase tracking-wider mb-3 flex items-center gap-2"
                                    style={{ color: 'var(--text-primary)' }}>
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
                                    Preventive Actions
                                </h3>
                                <ul className="space-y-2">
                                    {advisory.preventiveActions.map((rec, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                            • {rec}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {advisory.sourceUrl && (
                        <div className="pt-4 flex items-center justify-between text-xs" style={{ borderTop: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                            <span className="font-medium">Published: {new Date(advisory.publishedAt).toLocaleDateString()}</span>
                            <a
                                href={advisory.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 font-semibold hover:underline transition-colors uppercase tracking-wider group"
                                style={{ color: 'var(--accent)' }}
                            >
                                <ExternalLink size={12} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                                View Full Report
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---- Skeleton Loader for Advisories ----
function AdvisorySkeleton() {
    return (
        <div className="rounded-xl p-5 text-left animate-pulse flex flex-col h-[200px]"
            style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-xs)',
            }}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800 opacity-20 rounded-full" />
                <div className="w-12 h-3 bg-slate-100 dark:bg-slate-900 opacity-20 rounded-full" />
            </div>
            <div className="w-3/4 h-5 bg-slate-200 dark:bg-slate-800 opacity-20 rounded-lg mb-3" />
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-900 opacity-20 rounded-md mb-2" />
            <div className="w-5/6 h-3 bg-slate-100 dark:bg-slate-900 opacity-20 rounded-md mb-4 flex-1" />
            <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                <div className="w-20 h-3 bg-slate-200 dark:bg-slate-800 opacity-20 rounded-md" />
                <div className="w-16 h-3 bg-slate-100 dark:bg-slate-900 opacity-20 rounded-md" />
            </div>
        </div>
    );
}

// ---- Main Dashboard Page ----
export default function Dashboard() {
    const state = useStore();
    const [selectedAdvisory, setSelectedAdvisory] = useState<HealthAdvisory | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showAllNews, setShowAllNews] = useState(false);


    useEffect(() => {
        const loadNews = async () => {
            if (state.advisories.length === 0) {
                setIsRefreshing(true);
                const news = await fetchAndProcessHealthNews();
                setAdvisories(news);
                setIsRefreshing(false);
            }
        };
        loadNews();
    }, [state.advisories.length]);

    const totalClinics = state.campuses.filter((c) => c.active).length;
    const totalUsers = state.users.length;
    const lowStockItems = state.inventory.filter((i) => i.status === 'Low').length;

    // Count pending appointments
    const pendingAppointments = state.appointments.filter(
        (a) => a.status?.toUpperCase() === 'PENDING'
    ).length;

    return (
        <div className="space-y-5">
            {/* Page Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Dashboard Overview
                </h2>
                <p className="text-sm mt-0.5 font-medium opacity-70" style={{ color: 'var(--text-secondary)' }}>
                    Welcome back, Officer. Here's your health network snapshot.
                </p>
            </div>

            {/* ── KPI Value Cards — 3-Second Rule ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <KPICard icon={Clock} label="Pending Appointments" value={pendingAppointments} accent="#E5A832" />
                <KPICard icon={Activity} label="Active Clinics" value={totalClinics} accent="#48BBEE" />
                <KPICard icon={Users} label="Patient Records" value={totalUsers} accent="#2EBD85" />
                <KPICard icon={AlertTriangle} label="Low Stock Items" value={lowStockItems} accent="#E25C5C" />
            </div>

            {/* ── AI Health Advisories ── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-5 rounded-full" style={{ background: 'var(--accent)' }} />
                        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                            Global Health Snapshots
                        </h3>
                        {isRefreshing && (
                            <div
                                className="ml-2 w-4 h-4 rounded-full animate-spin"
                                style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }}
                            />
                        )}
                    </div>
                    <button
                        onClick={async () => {
                            setIsRefreshing(true);
                            const news = await fetchAndProcessHealthNews();
                            setAdvisories(news);
                            setIsRefreshing(false);
                        }}
                        className="text-[11px] font-semibold uppercase tracking-wider hover:underline disabled:opacity-50"
                        style={{ color: 'var(--accent)' }}
                        disabled={isRefreshing}
                    >
                        {isRefreshing ? 'Processing...' : 'Sync News'}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isRefreshing ? (
                        Array.from({ length: showAllNews ? 6 : 3 }).map((_, i) => <AdvisorySkeleton key={i} />)
                    ) : (
                        state.advisories.slice(0, showAllNews ? state.advisories.length : 3).map((adj) => (
                            <button
                                key={adj.id}
                                className="rounded-xl p-5 text-left transition-all duration-300 group relative overflow-hidden flex flex-col h-full"
                                style={{
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--border)',
                                    boxShadow: 'var(--shadow-xs)',
                                }}
                                onClick={() => setSelectedAdvisory(adj)}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                    e.currentTarget.style.borderColor = 'var(--accent)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <div className="flex items-start justify-between mb-3 relative z-10">
                                    <div className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                                        style={{
                                            background: adj.riskLevel === 'HIGH' ? 'var(--danger-bg)' :
                                                adj.riskLevel === 'MEDIUM' ? 'var(--warning-bg)' : 'var(--accent-light)',
                                            color: adj.riskLevel === 'HIGH' ? 'var(--danger-text)' :
                                                adj.riskLevel === 'MEDIUM' ? 'var(--warning-text)' : 'var(--accent-deep)'
                                        }}
                                    >
                                        {adj.riskLevel} Risk
                                    </div>
                                    <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                                        {adj.category}
                                    </div>
                                </div>

                                <h4 className="font-semibold text-sm mb-2 line-clamp-1 leading-snug transition-colors relative z-10"
                                    style={{ color: 'var(--text-primary)' }}>
                                    {adj.title}
                                </h4>

                                <p className="text-xs line-clamp-2 leading-relaxed mb-4 flex-1 relative z-10" style={{ color: 'var(--text-muted)' }}>
                                    {adj.oneSentenceSummary || adj.summary.replace('⚠️', '')}
                                </p>

                                <div className="flex items-center justify-between pt-3 relative z-10" style={{ borderTop: '1px solid var(--border-light)' }}>
                                    <span className="text-[11px] font-semibold uppercase tracking-wider group-hover:translate-x-0.5 transition-transform" style={{ color: 'var(--accent)' }}>
                                        Read Insights →
                                    </span>
                                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-faint)' }}>
                                        {new Date(adj.publishedAt).toLocaleDateString()}
                                    </span>
                                </div>

                                {/* Subtle background decoration */}
                                <div
                                    className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full group-hover:scale-150 transition-transform duration-500"
                                    style={{
                                        background: adj.riskLevel === 'HIGH' ? 'var(--danger)' : 'var(--accent)',
                                        opacity: 0.03,
                                    }}
                                />
                            </button>
                        ))
                    )}

                    {state.advisories.length === 0 && !isRefreshing && (
                        <div
                            className="col-span-full py-12 flex flex-col items-center justify-center rounded-xl"
                            style={{
                                background: 'var(--bg-wash)',
                                border: '2px dashed var(--border)',
                                color: 'var(--text-muted)',
                            }}
                        >
                            <Info size={32} className="mb-2 opacity-20" />
                            <p className="text-sm font-medium uppercase tracking-wider opacity-50">No health insights found</p>
                            <p className="text-xs mt-1">Try syncing news to generate fresh advisories.</p>
                        </div>
                    )}
                </div>

                {state.advisories.length > 3 && (
                    <div className="flex justify-center pt-2">
                        <button
                            onClick={() => setShowAllNews(!showAllNews)}
                            className="px-5 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all hover:bg-black/5"
                            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--card-bg)' }}
                        >
                            {showAllNews ? 'Show Less' : 'Show More'}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Dashboard Content Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Clinic Calendar */}
                <div className="lg:col-span-2 fade-in">
                    <CalendarWidget />
                </div>

                {/* Clinic Analytics Panel */}
                    <div
                        className="rounded-xl p-5 fade-in flex flex-col"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border)',
                            boxShadow: 'var(--shadow-sm)',
                        }}
                    >
                        {/* Section Header */}
                        <div className="mb-5">
                            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Clinic Analytics</h3>
                            <p className="text-[11px] font-normal mt-0.5" style={{ color: 'var(--text-muted)' }}>Request volume & status overview</p>
                        </div>

                        {/* ── Request Volume (Horizontal Bars) ── */}
                        <div className="space-y-3 mb-6">
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Volume by Type</p>
                            {(() => {
                                const maxVal = Math.max(
                                    state.appointments.length,
                                    state.medicineRequests.length,
                                    state.medicalCertRequests.length,
                                    state.inquiries.length,
                                    1
                                );
                                const bars = [
                                    { label: 'Appointments', value: state.appointments.length, color: '#E25C5C', bg: 'rgba(226,92,92,0.1)' },
                                    { label: 'Medicine Req.', value: state.medicineRequests.length, color: '#E5A832', bg: 'rgba(229,168,50,0.1)' },
                                    { label: 'Med Cert Req.', value: state.medicalCertRequests.length, color: '#48BBEE', bg: 'rgba(72,187,238,0.1)' },
                                    { label: 'Inquiries', value: state.inquiries.length, color: '#8896AA', bg: 'rgba(136,150,170,0.1)' },
                                ];
                                return bars.map(bar => (
                                    <div key={bar.label}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{bar.label}</span>
                                            <span className="text-[11px] font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{bar.value}</span>
                                        </div>
                                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: bar.bg }}>
                                            <div
                                                className="h-full rounded-full transition-all duration-700 ease-out"
                                                style={{
                                                    width: `${Math.max((bar.value / maxVal) * 100, 2)}%`,
                                                    background: `linear-gradient(90deg, ${bar.color}, ${bar.color}cc)`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>

                        {/* Divider */}
                        <div className="mb-5" style={{ height: '1px', background: 'var(--border-light)' }} />

                        {/* ── Status Breakdown ── */}
                        <div className="space-y-3 mb-6">
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Status Breakdown</p>
                            {(() => {
                                const pendingAppts = state.appointments.filter(a => a.status?.toUpperCase() === 'PENDING').length;
                                const resolvedAppts = state.appointments.length - pendingAppts;
                                const pendingMedReqs = state.medicineRequests.filter(r => r.status?.toUpperCase() === 'PENDING').length;
                                const resolvedMedReqs = state.medicineRequests.length - pendingMedReqs;
                                const pendingInq = state.inquiries.filter((i: any) => !i.completed_timestamp).length;
                                const resolvedInq = state.inquiries.length - pendingInq;
                                const pendingCerts = state.medicalCertRequests.filter(r => r.status?.toUpperCase() === 'PENDING').length;
                                const resolvedCerts = state.medicalCertRequests.length - pendingCerts;

                                const items = [
                                    { label: 'Appointments', pending: pendingAppts, resolved: resolvedAppts, total: state.appointments.length },
                                    { label: 'Medicine', pending: pendingMedReqs, resolved: resolvedMedReqs, total: state.medicineRequests.length },
                                    { label: 'Med Certs', pending: pendingCerts, resolved: resolvedCerts, total: state.medicalCertRequests.length },
                                    { label: 'Inquiries', pending: pendingInq, resolved: resolvedInq, total: state.inquiries.length },
                                ];

                                return items.map(item => {
                                    const pct = item.total > 0 ? Math.round((item.resolved / item.total) * 100) : 0;
                                    return (
                                        <div key={item.label} className="flex items-center gap-3">
                                            <span className="text-[11px] font-medium w-[72px] shrink-0 truncate" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                                            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-wash)' }}>
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{
                                                        width: `${Math.max(pct, 2)}%`,
                                                        background: pct >= 70 ? '#2EBD85' : pct >= 40 ? '#E5A832' : '#E25C5C',
                                                    }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold tabular-nums min-w-[85px] text-right shrink-0" style={{ color: pct >= 70 ? '#2EBD85' : pct >= 40 ? '#E5A832' : '#E25C5C' }}>
                                                {pct}% <span className="text-[10px] font-bold opacity-70 ml-1">({item.resolved}/{item.total})</span>
                                            </span>
                                        </div>
                                    );
                                });
                            })()}
                            <p className="text-[9px] font-medium italic mt-1" style={{ color: 'var(--text-faint)' }}>
                                % of requests resolved (non-pending)
                            </p>
                        </div>

                        {/* Divider */}
                        <div className="mb-5" style={{ height: '1px', background: 'var(--border-light)' }} />

                        {/* ── Inventory Health ── */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Inventory Health</p>
                            {(() => {
                                const healthy = state.inventory.filter(i => i.status === 'Available' && i.quantity >= 20).length;
                                const low = state.inventory.filter(i => i.status === 'Available' && i.quantity > 0 && i.quantity < 20).length;
                                const critical = state.inventory.filter(i => i.status === 'Expired' || i.quantity === 0).length;
                                const total = state.inventory.length || 1;
                                return (
                                    <>
                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                            <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(46,189,133,0.08)', border: '1px solid rgba(46,189,133,0.15)' }}>
                                                <p className="text-lg font-black leading-none" style={{ color: '#2EBD85' }}>{healthy}</p>
                                                <p className="text-[9px] font-bold uppercase tracking-wider mt-1 text-emerald-400">Healthy</p>
                                            </div>
                                            <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(229,168,50,0.08)', border: '1px solid rgba(229,168,50,0.15)' }}>
                                                <p className="text-lg font-black leading-none" style={{ color: '#E5A832' }}>{low}</p>
                                                <p className="text-[9px] font-bold uppercase tracking-wider mt-1 text-amber-400">Low Stock</p>
                                            </div>
                                            <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(226,92,92,0.08)', border: '1px solid rgba(226,92,92,0.15)' }}>
                                                <p className="text-lg font-black leading-none" style={{ color: '#E25C5C' }}>{critical}</p>
                                                <p className="text-[9px] font-bold uppercase tracking-wider mt-1 text-red-400">Critical</p>
                                            </div>
                                        </div>
                                        {/* Overall stock bar */}
                                        <div className="w-full h-2.5 rounded-full overflow-hidden flex" style={{ background: 'var(--bg-wash)' }}>
                                            <div className="h-full transition-all duration-700" style={{ width: `${(healthy / total) * 100}%`, background: '#2EBD85' }} />
                                            <div className="h-full transition-all duration-700" style={{ width: `${(low / total) * 100}%`, background: '#E5A832' }} />
                                            <div className="h-full transition-all duration-700" style={{ width: `${(critical / total) * 100}%`, background: '#E25C5C' }} />
                                        </div>
                                        <p className="text-[9px] font-medium mt-1.5 text-center" style={{ color: 'var(--text-faint)' }}>
                                            {state.inventory.length} total items tracked
                                        </p>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
            </div>

            {/* Advisory Modal */}
            {selectedAdvisory && <AdvisoryModal advisory={selectedAdvisory} onClose={() => setSelectedAdvisory(null)} />}
        </div>
    );
}

