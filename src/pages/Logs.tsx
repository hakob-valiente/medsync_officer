import { useState, useEffect, useMemo } from 'react';
import { Search, Clock, ChevronDown, Filter, Calendar, Activity, Database } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { fetchLogsFromDB } from '../store';
import type { SystemLog } from '../types';

function LogRow({ log, idx }: { log: SystemLog; idx: number }) {
    const fmtDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleString('en-PH', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
            });
        } catch (e) {
            return 'Invalid Date';
        }
    };

    return (
        <tr className="transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <td data-label="#" className="px-5 py-4 text-[13px] align-top" style={{ color: 'var(--text-faint)' }}>{idx + 1}</td>
            <td data-label="Timestamp" className="px-5 py-4 text-[13px] font-medium align-top whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{fmtDate(log.timestamp)}</td>
            <td data-label="Actor" className="px-5 py-4 align-top">
                <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{log.actor}</span>
            </td>
            <td data-label="Action" className="px-5 py-4 text-[15px] max-w-md leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <div className="rounded-lg p-3 transition-colors" style={{ background: 'var(--bg-wash)', border: '1px solid var(--border-light)' }}>
                    {log.action}
                </div>
            </td>
        </tr>
    );
}

export default function Logs() {
    const state = useStore();
    const [search, setSearch] = useState('');
    const [timeRange, setTimeRange] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        fetchLogsFromDB();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, timeRange]);

    const filtered = useMemo(() => {
        const now = new Date();
        return state.logs.filter((log) => {
            const matchesSearch =
                (log.actor || '').toLowerCase().includes(search.toLowerCase()) ||
                (log.action || '').toLowerCase().includes(search.toLowerCase());
            
            let matchesTime = true;
            const logDate = new Date(log.timestamp);
            const diffHours = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60);

            if (timeRange === '24h') matchesTime = diffHours <= 24;
            else if (timeRange === '7d') matchesTime = diffHours <= 24 * 7;
            else if (timeRange === '30d') matchesTime = diffHours <= 24 * 30;

            return matchesSearch && matchesTime;
        });
    }, [state.logs, search, timeRange]);

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedLogs = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>System Logs</h2>
                    <p className="text-[15px] mt-1 font-medium opacity-70" style={{ color: 'var(--text-secondary)' }}>
                        Audit trail of all administrative actions and system updates.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                    style={{ background: 'var(--accent-light)', border: '1px solid rgba(72, 187, 238, 0.15)' }}>
                    <Clock size={16} style={{ color: 'var(--accent)' }} />
                    <span className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-deep)' }}>Live Updates Active</span>
                </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="kpi-card fade-in overflow-hidden relative" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', padding: '1.25rem', borderRadius: '1rem' }}>
                    <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: 'var(--accent)', opacity: 0.7 }} />
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Total Actions</p>
                            <p className="text-3xl font-bold tracking-tight mt-1.5" style={{ color: 'var(--text-primary)' }}>{state.logs.length}</p>
                        </div>
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-light)' }}>
                            <Database size={20} style={{ color: 'var(--accent)' }} strokeWidth={2.2} />
                        </div>
                    </div>
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full" style={{ background: 'var(--accent)', opacity: 0.03 }} />
                </div>

                <div className="kpi-card fade-in overflow-hidden relative" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', padding: '1.25rem', borderRadius: '1rem' }}>
                    <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: 'var(--success)', opacity: 0.7 }} />
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Recent Filtered</p>
                            <p className="text-3xl font-bold tracking-tight mt-1.5" style={{ color: 'var(--text-primary)' }}>{filtered.length}</p>
                        </div>
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--success-bg)' }}>
                            <Activity size={20} style={{ color: 'var(--success)' }} strokeWidth={2.2} />
                        </div>
                    </div>
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full" style={{ background: 'var(--success)', opacity: 0.03 }} />
                </div>

                <div className="kpi-card fade-in overflow-hidden relative" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', padding: '1.25rem', borderRadius: '1rem' }}>
                    <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: 'var(--warning)', opacity: 0.7 }} />
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Last Activity</p>
                            <p className="text-xl font-bold tracking-tight mt-1.5" style={{ color: 'var(--text-primary)' }}>
                                {state.logs[0] ? new Date(state.logs[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--warning-bg)' }}>
                            <Calendar size={20} style={{ color: 'var(--warning)' }} strokeWidth={2.2} />
                        </div>
                    </div>
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full" style={{ background: 'var(--warning)', opacity: 0.03 }} />
                </div>
            </div>

            {/* Quick Filters Bar */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[300px] max-w-md">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by actor or action taken..."
                        className="w-full rounded-xl pl-12 pr-4 py-3 text-[15px] font-medium outline-none transition-all"
                        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', color: 'var(--text-primary)' }}
                    />
                </div>
                <div className="relative min-w-[200px]">
                    <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="w-full appearance-none rounded-xl pl-12 pr-10 py-3 text-[15px] font-medium outline-none transition-all"
                        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', color: 'var(--text-primary)' }}
                    >
                        <option value="All">All Time</option>
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
                </div>
            </div>

            {/* Table Container */}
            <div className="mobile-card-table rounded-xl overflow-hidden flex flex-col min-h-[500px]"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full zebra-table">
                        <thead>
                            <tr style={{ background: 'var(--bg-wash)', borderBottom: '1px solid var(--border)' }}>
                                {['#', 'Timestamp', 'Actor', 'Action Description'].map((h) => (
                                    <th key={h} className="text-left text-[10px] font-black uppercase tracking-widest px-5 py-4"
                                        style={{ color: 'var(--text-muted)' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3" style={{ color: 'var(--text-faint)' }}>
                                            <Calendar size={48} className="opacity-20" />
                                            <p className="text-[15px] font-medium">No log entries found for this filter</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedLogs.map((log, idx) => (
                                    <LogRow key={log.id} log={log} idx={(currentPage - 1) * itemsPerPage + idx} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 flex items-center justify-between mt-auto"
                    style={{ background: 'var(--bg-wash)', borderTop: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-4 ml-auto">
                        <span className="text-[12px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            Page {currentPage} of {Math.max(1, totalPages)}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors"
                                style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors"
                                style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

