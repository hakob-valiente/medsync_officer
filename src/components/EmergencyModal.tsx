import React from 'react';
import { X, AlertTriangle, MapPin, Users, Activity, CheckCircle2 } from 'lucide-react';
import type { EmergencyReport } from '../types';
import { updateEmergencyReportStatusDB } from '../store';

interface EmergencyModalProps {
    report: EmergencyReport;
    onClose: () => void;
}

export function EmergencyModal({ report, onClose }: EmergencyModalProps) {
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleAcknowledge = async () => {
        setIsSubmitting(true);
        try {
            // "set status to completed" -> using 'RESOLVED' as it maps to completed in the schema
            await updateEmergencyReportStatusDB(report.id, 'RESOLVED');
            onClose();
        } catch (e) {
            console.error('Error acknowledging emergency:', e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all animate-in fade-in duration-300">
            <div 
                className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-red-500/20 animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Section with Pulsing Effect */}
                <div className="relative p-8 bg-gradient-to-br from-red-600 via-red-500 to-rose-600 overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-900/20 rounded-full -ml-16 -mb-16 blur-2xl" />
                    
                    <div className="relative flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner border border-white/30">
                                <AlertTriangle size={32} className="animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight leading-tight uppercase">Emergency Report</h2>
                                <p className="text-red-100 text-[11px] font-bold uppercase tracking-[0.2em] mt-1 opacity-80">Immediate Response Required</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-8 space-y-8">
                    {/* Requester Info */}
                    <div className="flex items-center gap-4 p-5 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-500/20">
                        <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-500/30">
                            <Users size={24} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-0.5">Requester Full Name</p>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white truncate uppercase">{report.requester_name}</h3>
                        </div>
                    </div>

                    {/* Emergency Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-2 text-slate-400 dark:text-slate-500">
                                <Activity size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Emergency Type</span>
                            </div>
                            <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase">{report.emergency_type}</p>
                        </div>
                        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-2 text-slate-400 dark:text-slate-500">
                                <Users size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Victim Count</span>
                            </div>
                            <p className="text-sm font-black text-slate-800 dark:text-slate-200">{report.victim_count} Person(s)</p>
                        </div>
                    </div>

                    {/* Location Section */}
                    <div className="p-6 bg-slate-900 dark:bg-black rounded-3xl shadow-xl shadow-slate-900/10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center shadow-lg shadow-[var(--accent-subtle)]">
                                <MapPin size={18} />
                            </div>
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Location Details</span>
                        </div>
                        <p className="text-lg font-black text-white leading-tight mb-2">
                            {report.full_location}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2.5 py-1 rounded-md bg-white/10 text-[10px] font-bold text-slate-300 uppercase">{report.campus}</span>
                            <span className="px-2.5 py-1 rounded-md bg-white/10 text-[10px] font-bold text-slate-300 uppercase">{report.building}</span>
                            {report.floor && <span className="px-2.5 py-1 rounded-md bg-white/10 text-[10px] font-bold text-slate-300 uppercase">{report.floor}</span>}
                            <span className="px-2.5 py-1 rounded-md bg-white/10 text-[10px] font-bold text-slate-300 uppercase">{report.exact_location}</span>
                        </div>
                    </div>

                    {/* Footer / Action */}
                    <div className="pt-2 flex flex-col gap-3">
                        <button 
                            onClick={handleAcknowledge}
                            disabled={isSubmitting}
                            className="group relative w-full h-16 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.15em] overflow-hidden shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                            <div className="relative flex items-center justify-center gap-2">
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 size={20} />
                                        <span>ACKNOWLEDGE & RESOLVE</span>
                                    </>
                                )}
                            </div>
                        </button>
                        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
                            Acknowledging will mark this emergency as RESOLVED
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
