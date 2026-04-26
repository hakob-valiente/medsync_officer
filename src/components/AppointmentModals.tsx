import React, { useState, useEffect, useMemo } from 'react';
import { X, ShieldCheck, Clock, MapPin, Calendar, User, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { useStore } from '../hooks/useStore';
import { updateAcceptedAppointmentDB, addLog } from '../store';
import { notifyIndividual } from '../lib/notifications';

// --- Utils ---
export function formatDate(dateStr: string) {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        return format(d, 'MMM dd, yyyy');
    } catch {
        return dateStr;
    }
}

export function formatTime(dateStr: string) {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        return format(d, 'hh:mm a');
    } catch {
        return dateStr;
    }
}

export function parseTimeTo24h(time12h: string) {
    if (!time12h) return '09:00';
    const [time, period] = time12h.split(' ');
    let [h, m] = time.split(':');
    let hh = parseInt(h);
    if (period === 'PM' && hh < 12) hh += 12;
    if (period === 'AM' && hh === 12) hh = 0;
    return `${hh.toString().padStart(2, '0')}:${m}`;
}

export function parseTimeFrom24h(time24h: string) {
    if (!time24h) return '09:00 AM';
    let [h, m] = time24h.split(':');
    let hh = parseInt(h);
    const period = hh >= 12 ? 'PM' : 'AM';
    let displayH = hh % 12;
    if (displayH === 0) displayH = 12;
    return `${displayH.toString().padStart(2, '0')}:${m} ${period}`;
}

// --- Shared Components ---

export function ScrollableColumn({ options, value, onChange, label, className }: { options: string[], value: string, onChange: (val: string) => void, label: string, className?: string }) {
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const index = options.indexOf(value);
            if (e.deltaY > 0) {
                onChange(options[(index + 1) % options.length]);
            } else {
                onChange(options[(index - 1 + options.length) % options.length]);
            }
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [options, value, onChange]);

    return (
        <div
            ref={containerRef}
            className={`flex-1 flex flex-col items-center py-5 cursor-ns-resize transition-all hover:bg-black/5 select-none ${className}`}
        >
            <span className="text-[10px] uppercase font-black tracking-tighter mb-1.5 opacity-40">{label}</span>
            <span className="text-sm font-bold tracking-tight">{value}</span>
        </div>
    );
}

export function TimeWheelPicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const time12h = parseTimeFrom24h(value);
    const parts = time12h.split(' ');
    const hPart = parts[0].split(':')[0];
    const mPart = parts[0].split(':')[1];
    const pPart = parts[1];

    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const minutes = ['00', '30'];
    const periods = ['AM', 'PM'];

    const handleChange = (newH: string, newM: string, newP: string) => {
        onChange(parseTimeTo24h(`${newH}:${newM} ${newP}`));
    };

    return (
        <div className="flex items-center rounded-2xl bg-[var(--bg-wash)] border border-[var(--border-light)] overflow-hidden shadow-inner">
            <ScrollableColumn
                label="Hour"
                options={hours}
                value={hPart}
                onChange={val => handleChange(val, mPart, pPart)}
            />
            <div className="w-[1px] h-10 bg-[var(--border-light)]" />
            <ScrollableColumn
                label="Min"
                options={minutes}
                value={mPart}
                onChange={val => handleChange(hPart, val, pPart)}
            />
            <div className="w-[1px] h-10 bg-[var(--border-light)]" />
            <ScrollableColumn
                label="Period"
                options={periods}
                value={pPart}
                onChange={val => handleChange(hPart, mPart, val)}
                className="text-[var(--accent)]"
            />
        </div>
    );
}

export function ExpandReasonModal({ appointment, onClose }: any) {
    if (!appointment) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div
                className="rounded-3xl w-full max-w-md fade-in overflow-hidden border border-white/20 shadow-2xl"
                style={{
                    background: 'var(--card-bg)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 flex items-center justify-between border-b border-slate-100"
                    style={{ background: 'var(--bg-wash)' }}>
                    <div>
                        <h3 className="text-lg font-extrabold text-[var(--text-primary)]" style={{ fontFamily: 'Poppins' }}>Request Insight</h3>
                        <p
                            className="text-[11px] font-black uppercase tracking-widest mt-0.5"
                            style={{ color: 'var(--text-muted)', opacity: 0.85 }}
                        >
                            Full statement from patient
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6 p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 overflow-hidden shadow-sm"
                            style={{ background: 'linear-gradient(135deg, #3BACED, #1E87C8)' }}>
                            {appointment.profiles?.profile_picture_url ? (
                                <img src={appointment.profiles.profile_picture_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <ShieldCheck size={20} />
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-black text-blue-900 leading-none">{appointment.requester_name}</p>
                            <p className="text-[11px] font-bold text-blue-500 mt-1 uppercase tracking-wider">{appointment.category || 'Medical Request'}</p>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute -left-4 top-0 w-1 h-full bg-[var(--accent)] rounded-full opacity-20" />
                        <p className="text-sm italic font-medium leading-relaxed text-slate-600 pl-2">
                            "{appointment.visit_reason}"
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function RejectAppointmentModal({ appointment, onClose, onConfirm, isSubmitting, title, description, actionLabel }: any) {
    const [reason, setReason] = useState('');
    const modalTitle = title || "Decline Appointment";
    const modalDesc = description || "Are you sure you want to decline this appointment? This action will notify the patient immediately.";
    const btnLabel = actionLabel || "Decline Request";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div
                className="rounded-3xl w-full max-w-md fade-in overflow-hidden border border-white/20 shadow-2xl"
                style={{
                    background: 'var(--card-bg)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 md:p-6 flex items-center justify-between border-b border-red-50"
                    style={{ background: 'var(--danger-bg)' }}>
                    <div>
                        <h3 className="text-base md:text-lg font-bold tracking-tight text-red-900">{modalTitle}</h3>
                        <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-red-700/60 mt-0.5">
                            Target: {appointment.requester_name}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-black/5 transition-colors text-red-900/40">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 md:p-8 space-y-4 md:space-y-6 max-h-[60vh] overflow-y-auto">
                    <div className="p-3 md:p-4 rounded-2xl border border-red-100 bg-red-50/50">
                        <p className="text-[11px] md:text-xs text-red-800 leading-relaxed font-medium">
                            {modalDesc}
                        </p>
                    </div>

                    <div>
                        <label
                            className="block text-[11px] font-black uppercase tracking-widest mb-2 ml-1"
                            style={{ color: 'var(--text-muted)', opacity: 0.9 }}
                        >
                            Reason for Rejection
                        </label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Please provide a brief explanation to the patient..."
                            className="w-full rounded-2xl px-5 py-4 text-sm font-medium outline-none transition-all min-h-[120px] resize-none border border-slate-100 bg-slate-50 focus:bg-white focus:border-red-200 focus:shadow-inner"
                        />
                    </div>
                </div>

                <div className="p-5 md:p-6 flex gap-3 border-t border-slate-50" style={{ background: 'var(--bg-wash)' }}>
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all border border-slate-100"
                    >
                        Keep Request
                    </button>
                    <button
                        onClick={() => onConfirm(reason)}
                        disabled={!reason.trim() || isSubmitting}
                        className="flex-[2] py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:scale-100 "
                        style={{ background: 'var(--danger)', color: 'white' }}
                    >
                        {isSubmitting ? 'DECLINING...' : btnLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function AcceptAppointmentModal({ appointment, onClose, onConfirm, isSubmitting }: any) {
    const { campuses, acceptedAppointments } = useStore();
    const contactNumber = appointment.contact_number || 'N/A';

    const [form, setForm] = useState({
        date: '',
        time: '',
        nurse_assigned: 'Nurse Sarah',
        campus: campuses[0]?.name || 'Main',
        category: appointment.category || 'Medical'
    });

    const findNearest = () => {
        let current = new Date();
        current.setMinutes(current.getMinutes() > 30 ? 60 : (current.getMinutes() > 0 ? 30 : 0));
        current.setSeconds(0, 0);

        for (let d = 0; d < 14; d++) {
            let day = new Date(current);
            day.setDate(day.getDate() + d);
            const dateStr = `${day.getFullYear()}-${(day.getMonth() + 1).toString().padStart(2, '0')}-${day.getDate().toString().padStart(2, '0')}`;

            let startH = (d === 0) ? Math.max(7, day.getHours()) : 7;
            for (let h = startH; h < 17; h++) {
                for (let m of [0, 30]) {
                    if (d === 0 && h === day.getHours() && day.getMinutes() > m) continue;
                    const tStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                    const isBooked = acceptedAppointments.some(a =>
                        a.campus === form.campus &&
                        a.appointment_sched?.startsWith(dateStr) &&
                        a.appointment_sched?.includes(tStr)
                    );
                    if (!isBooked) {
                        setForm(p => ({ ...p, date: dateStr, time: tStr }));
                        return;
                    }
                }
            }
        }
    };

    useEffect(() => {
        findNearest();
    }, [form.campus]);

    const allSlotsWithStatus = useMemo(() => {
        if (!form.date || !form.campus) return [];
        
        const slots = [];
        for (let h = 7; h < 17; h++) {
            slots.push(`${h.toString().padStart(2, '0')}:00`, `${h.toString().padStart(2, '0')}:30`);
        }
        slots.push('17:00');

        const booked = acceptedAppointments
            .filter(a => a.campus === form.campus && a.appointment_sched?.startsWith(form.date))
            .map(a => {
                try { 
                    const d = new Date(a.appointment_sched);
                    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                } catch { return ''; }
            });
        
        const now = new Date();

        return slots.map(t => {
            let status = 'available';
            if (booked.includes(t)) status = 'occupied';
            
            const checkDate = new Date(`${form.date}T${t}:00`);
            if (!isNaN(checkDate.getTime()) && now > checkDate) {
                status = 'finished';
            }
            return { time: t, status };
        });
    }, [form.date, form.campus, acceptedAppointments]);

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-3xl w-full max-w-xl fade-in overflow-hidden shadow-2xl border border-white/20" style={{ background: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
                <div className="p-4 md:p-6 flex items-center justify-between border-b border-slate-100" style={{ background: 'var(--bg-wash)' }}>
                    <div>
                        <h3 className="text-lg md:text-xl font-bold tracking-tight text-[var(--text-primary)]">Schedule Appointment</h3>
                        <p className="text-[10px] md:text-[11px] uppercase font-bold tracking-widest text-slate-400 mt-1">Booking for {appointment.requester_name}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-black/5 transition-colors text-slate-400"><X size={18} /></button>
                </div>

                <div className="p-5 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 overflow-y-auto max-h-[65vh]">
                    {/* Left: Info Summary */}
                    <div className="space-y-6">
                        <div className="p-4 md:p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-inner">
                            <div className="flex items-center gap-3 mb-3 md:mb-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 overflow-hidden"
                                    style={{ background: 'linear-gradient(135deg, #3BACED, #1E87C8)' }}>
                                    {appointment.profiles?.profile_picture_url ? (
                                        <img src={appointment.profiles.profile_picture_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <ShieldCheck size={20} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-black text-slate-900 truncate">{appointment.requester_name}</h4>
                                    <p className="text-[10px] md:text-[11px] font-bold text-[var(--accent)] uppercase tracking-widest mt-0.5">#{appointment.requester_student_number}</p>
                                </div>
                            </div>

                            <div className="space-y-2 md:space-y-3">
                                <div className="flex items-center gap-2">
                                    <Clock size={12} className="text-slate-400" />
                                    <span className="text-[11px] font-bold text-slate-600 truncate">{contactNumber}</span>
                                </div>
                                <div className="p-2.5 md:p-3 bg-white rounded-xl border border-slate-100 italic text-[11px] md:text-[12px] leading-relaxed text-slate-500 line-clamp-2">
                                    "{appointment.visit_reason}"
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4
                                    className="text-[11px] uppercase font-black tracking-widest ml-1"
                                    style={{ color: 'var(--text-muted)', opacity: 0.9 }}
                                >
                                    Staff Assignment
                                </h4>
                            </div>
                            <div className="space-y-2">
                                <label
                                    className="block text-[10px] uppercase font-black ml-1 mb-1"
                                    style={{ color: 'var(--text-muted)', opacity: 0.9 }}
                                >
                                    Assign Personnel
                                </label>
                                <select
                                    value={form.nurse_assigned}
                                    onChange={e => setForm(p => ({ ...p, nurse_assigned: e.target.value }))}
                                    className="w-full rounded-2xl px-5 py-4 text-sm font-bold bg-slate-50 border border-slate-200 shadow-sm outline-none focus:bg-white focus:border-[var(--accent)] transition-all"
                                >
                                    <option value="Nurse Sarah">Nurse Sarah</option>
                                    <option value="Nurse Abby">Nurse Abby</option>
                                    <option value="Dr. Garcia">Dr. Garcia</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Right: Booking Details */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h4
                                className="text-[11px] uppercase font-black tracking-widest ml-1"
                                style={{ color: 'var(--text-muted)', opacity: 0.9 }}
                            >
                                Schedule Details
                            </h4>
                            <button onClick={findNearest} className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1.5 hover:bg-emerald-500 hover:text-white transition-all active:scale-95">
                                <Clock size={12} /> Suggest Slot
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label
                                    className="block text-[10px] uppercase font-black ml-1 mb-1"
                                    style={{ color: 'var(--text-muted)', opacity: 0.9 }}
                                >
                                    Location / Campus
                                </label>
                                <select value={form.campus} onChange={e => setForm(p => ({ ...p, campus: e.target.value }))} className="w-full rounded-2xl px-5 py-3.5 text-sm font-bold bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-[var(--accent)] transition-all">{campuses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                            </div>
                            <div>
                                <label
                                    className="block text-[10px] uppercase font-black ml-1 mb-1"
                                    style={{ color: 'var(--text-muted)', opacity: 0.9 }}
                                >
                                    Appointment Date
                                </label>
                                <input type="date" value={form.date} min={new Date().toLocaleDateString('en-CA')} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="w-full rounded-2xl px-5 py-3.5 text-sm font-bold bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-[var(--accent)] transition-all" />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1.5 ml-1">
                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Time Slot Selection</label>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-100">
                                        <Clock size={10} />
                                        <span className="text-[8px] font-black uppercase">07:00 AM - 05:00 PM</span>
                                    </div>
                                </div>
                                <TimeWheelPicker value={form.time || '07:00'} onChange={v => setForm(p => ({ ...p, time: v }))} />
                            </div>
                        </div>

                        {form.time && allSlotsWithStatus.find(x => x.time === form.time)?.status !== 'available' ? (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-500 border border-red-100 animate-pulse">
                                <X size={14} className="shrink-0" />
                                <span className="text-[11px] font-black uppercase tracking-widest">
                                    {allSlotsWithStatus.find(x => x.time === form.time)?.status === 'occupied' ? 'This slot is already occupied' : 'This slot is already finished/past'}
                                </span>
                            </div>
                        ) : form.time && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                <span className="text-[11px] font-black uppercase tracking-widest">Selected Slot is Available</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-5 md:p-8 bg-slate-50 border-t border-slate-200 flex gap-3 md:gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all border border-slate-200 bg-white"
                    >
                        Dismiss
                    </button>
                    <button
                        onClick={() => onConfirm(form)}
                        disabled={!form.date || !form.time || allSlotsWithStatus.find(x => x.time === form.time)?.status !== 'available' || isSubmitting}
                        className="flex-[2] py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-[var(--accent-subtle)] active:scale-95 disabled:opacity-40 disabled:shadow-none"
                        style={{ background: 'linear-gradient(135deg, #3BACED, #1E87C8)' }}
                    >
                        {isSubmitting ? 'Confirming...' : 'Schedule Appointment'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ViewAcceptedAppointmentModal({ appointment, campuses, onClose, onSendBack, setSuccessToast }: any) {
    const { acceptedAppointments } = useStore();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const existingDate = appointment.appointment_sched ? new Date(appointment.appointment_sched) : new Date();
    const initDate = isNaN(existingDate.getTime()) ? '' : existingDate.toLocaleDateString('en-CA');
    const initTime = isNaN(existingDate.getTime()) ? '' : `${existingDate.getHours().toString().padStart(2, '0')}:${existingDate.getMinutes().toString().padStart(2, '0')}`;

    const [form, setForm] = useState({
        date: initDate,
        time: initTime,
        nurse_assigned: appointment.nurse_assigned || 'Nurse Abby',
        campus: appointment.campus || 'Main',
        editReason: 'Sudden Changes'
    });

    const findNearest = () => {
        let current = new Date();
        current.setMinutes(current.getMinutes() > 30 ? 60 : (current.getMinutes() > 0 ? 30 : 0));
        current.setSeconds(0, 0);

        for (let d = 0; d < 14; d++) {
            let day = new Date(current);
            day.setDate(day.getDate() + d);
            const dateStr = `${day.getFullYear()}-${(day.getMonth() + 1).toString().padStart(2, '0')}-${day.getDate().toString().padStart(2, '0')}`;

            let startH = (d === 0) ? Math.max(7, day.getHours()) : 7;
            for (let h = startH; h < 17; h++) {
                for (let m of [0, 30]) {
                    if (d === 0 && h === day.getHours() && m < day.getMinutes()) continue;
                    const tStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                    const isBooked = acceptedAppointments.some(a =>
                        a.id !== appointment.id &&
                        a.campus === form.campus &&
                        a.appointment_sched?.startsWith(dateStr) &&
                        a.appointment_sched?.includes(tStr)
                    );
                    if (!isBooked) {
                        setForm(p => ({ ...p, date: dateStr, time: tStr }));
                        return;
                    }
                }
            }
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateAcceptedAppointmentDB(appointment.id, {
                nurse_assigned: form.nurse_assigned,
                appointment_sched: `${form.date}T${form.time}`,
                campus: form.campus,
                category: appointment.category
            }, form.editReason);

            await notifyIndividual(
                appointment.requester_id,
                'Appointment Update',
                `Your appointment has been rescheduled on ${format(new Date(form.date), 'MMM dd, yyyy')} at ${form.time}.`,
                'appointment_accepted',
                appointment.appointment_id
            );

            addLog('Admin', `Updated schedule for ${appointment.requester_name}`);
            setSuccessToast({ show: true, message: 'Schedule updated successfully!' });
            setTimeout(() => setSuccessToast({ show: false, message: '' }), 3000);
            setIsEditing(false);
            onClose(); // Optional: close on save
        } catch (e: any) {
            alert(e.message || 'Failed to update appointment');
        } finally {
            setIsSaving(false);
        }
    };

    const allSlotsWithStatus = useMemo(() => {
        if (!form.date || !form.campus) return [];
        const slots = [];
        for (let h = 7; h < 17; h++) {
            slots.push(`${h.toString().padStart(2, '0')}:00`, `${h.toString().padStart(2, '0')}:30`);
        }
        slots.push('17:00');

        const booked = acceptedAppointments
            .filter(a => a.id !== appointment.id && a.campus === form.campus && a.appointment_sched?.startsWith(form.date))
            .map(a => {
                try { 
                    const d = new Date(a.appointment_sched);
                    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                } catch { return ''; }
            });
        
        const now = new Date();

        return slots.map(t => {
            if (form.date === initDate && t === initTime) {
                return { time: t, status: 'available' };
            }
            let status = 'available';
            if (booked.includes(t)) status = 'occupied';
            const checkDate = new Date(`${form.date}T${t}:00`);
            if (!isNaN(checkDate.getTime()) && now > checkDate) {
                status = 'finished';
            }
            return { time: t, status };
        });
    }, [form.date, form.campus, acceptedAppointments, appointment.id, initDate, initTime]);

    const isChanged = form.date !== initDate ||
        form.time !== initTime ||
        form.nurse_assigned !== (appointment.nurse_assigned || 'Nurse Abby') ||
        form.campus !== (appointment.campus || 'Main');

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-3xl w-full max-w-xl fade-in overflow-hidden shadow-2xl border border-white/20" style={{ background: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
                <div className="p-4 md:p-6 flex items-center justify-between border-b border-slate-100" style={{ background: 'var(--bg-wash)' }}>
                    <div>
                        <h3 className="text-lg md:text-xl font-bold tracking-tight text-[var(--text-primary)]">Appointment Details</h3>
                        <p className="text-[10px] md:text-[11px] uppercase font-bold tracking-widest text-slate-400 mt-1">Official Managed Record</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-black/5 transition-colors text-slate-400"><X size={18} /></button>
                </div>

                <div className="p-5 md:p-8 space-y-6 md:space-y-8 overflow-y-auto max-h-[65vh]">
                    <div className="flex items-center gap-5 p-5 bg-slate-50 rounded-3xl border border-slate-200 shadow-inner">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shrink-0 overflow-hidden"
                             style={{ background: 'linear-gradient(135deg, #3BACED, #1E87C8)' }}>
                            {appointment.profiles?.profile_picture_url ? (
                                <img src={appointment.profiles.profile_picture_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <User size={32} className="text-white" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded-md bg-[var(--accent-light)] text-[var(--accent)] text-[10px] font-black uppercase tracking-wider">
                                    {(appointment.category || 'Med').split(' ')[0]}
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 tracking-widest">#{appointment.requester_student_number || 'N/A'}</span>
                            </div>
                            <h4 className="text-lg font-black text-slate-900 truncate">{appointment.requester_name}</h4>
                            <p className="text-xs font-semibold text-slate-500 mt-0.5">{appointment.contact_number || 'No contact provided'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Booking Details */}
                        <div className="space-y-6">
                            <h4 className="text-[11px] uppercase font-black tracking-widest text-slate-400 ml-1">Schedule Information</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] uppercase font-black text-slate-400 ml-1 mb-1.5">Campus Location</label>
                                    {isEditing ? (
                                        <select value={form.campus} onChange={e => setForm(p => ({ ...p, campus: e.target.value }))} className="w-full rounded-2xl px-5 py-3.5 text-sm font-bold bg-slate-100 border border-slate-200 outline-none focus:bg-white focus:border-[var(--accent)] transition-all">{campuses.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                                    ) : (
                                        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-slate-50 text-sm font-extrabold text-slate-700 border border-slate-100"><MapPin size={16} className="text-slate-400" /> {form.campus}</div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div className="col-span-1">
                                        <div className="mb-1.5 ml-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Scheduled Date</label>
                                        </div>
                                        {isEditing ? (
                                            <input 
                                                type="date" 
                                                value={form.date} 
                                                min={new Date().toLocaleDateString('en-CA') > form.date ? form.date : new Date().toLocaleDateString('en-CA')} 
                                                onChange={e => setForm(p => ({ ...p, date: e.target.value }))} 
                                                className="w-full rounded-2xl px-5 py-4 text-sm font-bold bg-white border border-slate-200 outline-none focus:border-[var(--accent)] transition-all shadow-sm" 
                                            />
                                        ) : (
                                            <div className="px-5 py-4 rounded-3xl bg-slate-900 border border-slate-700 shadow-xl">
                                                <div className="flex items-center gap-2 mb-1 opacity-60">
                                                    <Calendar size={12} className="text-white" />
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-white">Date</p>
                                                </div>
                                                <p className="text-lg font-black text-white">{formatDate(form.date)}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-1">
                                        <div className="mb-1.5 ml-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Designated Time</label>
                                        </div>
                                        {isEditing ? (
                                            <>
                                                <TimeWheelPicker value={form.time || '07:00'} onChange={v => setForm(p => ({ ...p, time: v }))} />
                                                <div className="mt-3">
                                                    {form.time && allSlotsWithStatus.find(x => x.time === form.time)?.status !== 'available' ? (
                                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-500 border border-red-100 animate-pulse">
                                                            <X size={14} className="shrink-0" />
                                                            <span className="text-[11px] font-black uppercase tracking-widest text-left leading-tight">
                                                                {allSlotsWithStatus.find(x => x.time === form.time)?.status === 'occupied' ? 'This slot is already occupied' : 'This slot is already finished/past'}
                                                            </span>
                                                        </div>
                                                    ) : form.time && (
                                                        <div className={`flex items-center gap-2 p-3 rounded-xl border animate-pulse ${form.date === initDate && form.time === initTime ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full animate-ping ${form.date === initDate && form.time === initTime ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                                            <span className="text-[11px] font-black uppercase tracking-widest">
                                                                {form.date === initDate && form.time === initTime ? 'Currently Assigned Slot' : 'New Slot is Available'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="px-5 py-4 rounded-3xl bg-[var(--accent)] border border-[var(--accent)] shadow-xl shadow-[var(--accent-subtle)]">
                                                <div className="flex items-center gap-2 mb-1 opacity-80">
                                                    <Clock size={12} className="text-white" />
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-white">Designated Arrival</p>
                                                </div>
                                                <p className="text-xl font-black text-white">{parseTimeFrom24h(form.time)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Staff & Status */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[11px] uppercase font-black tracking-widest text-slate-400 ml-1">Staff Coordination</h4>
                                {isEditing && (
                                    <button onClick={findNearest} className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1.5 hover:bg-blue-500 hover:text-white transition-all active:scale-95">
                                        <Clock size={12} /> Find Slot
                                    </button>
                                )}
                            </div>
                            <div className="space-y-4">
                                {isEditing && (
                                    <div>
                                        <label className="block text-[10px] uppercase font-black text-slate-400 ml-1 mb-1.5 tracking-widest">Modification Reason</label>
                                        <select value={form.editReason} onChange={e => setForm(p => ({ ...p, editReason: e.target.value }))} className="w-full rounded-2xl px-5 py-3.5 text-sm font-bold bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:border-[var(--accent)] transition-all">
                                            <option value="Sudden Changes">Sudden Changes</option>
                                            <option value="Staff Unavailable">Staff Unavailable</option>
                                            <option value="Patient Request">Patient Request</option>
                                            <option value="Campus Holiday">Campus Holiday</option>
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-[10px] uppercase font-black text-slate-400 ml-1 mb-1.5 tracking-widest">Assigned Professional</label>
                                    {isEditing ? (
                                        <select value={form.nurse_assigned} onChange={e => setForm(p => ({ ...p, nurse_assigned: e.target.value }))} className="w-full rounded-2xl px-5 py-3.5 text-sm font-bold bg-slate-100 border border-slate-200 outline-none focus:bg-white focus:border-[var(--accent)] transition-all">
                                            <option value="Nurse Sarah">Nurse Sarah</option>
                                            <option value="Nurse Abby">Nurse Abby</option>
                                            <option value="Dr. Garcia">Dr. Garcia</option>
                                        </select>
                                    ) : (
                                        <div className="px-5 py-4 rounded-2xl bg-slate-50 text-sm font-extrabold text-slate-700 border border-slate-100">{form.nurse_assigned}</div>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] uppercase font-black text-slate-400 ml-1 tracking-widest">Visit Reason</label>
                                    <div className="p-4 rounded-2xl bg-[var(--bg-wash)] border border-slate-100 italic text-[12px] leading-relaxed text-slate-600 font-medium">
                                        "{appointment.visit_reason}"
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-5 md:p-8 bg-slate-50 border-t border-slate-100 flex gap-3 md:gap-4">
                    {!isEditing ? (
                        <>
                            <button
                                onClick={onSendBack}
                                className="flex-1 py-4 rounded-2xl text-[11px] uppercase font-bold tracking-widest text-red-600 border border-red-200 bg-red-50/50 hover:bg-red-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={12} /> Rollback
                            </button>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex-[2] py-4 rounded-2xl text-[11px] uppercase font-bold tracking-widest bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-subtle)] hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                Edit Selection
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex-1 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all border border-slate-200 bg-white shadow-sm"
                            >
                                Cancel Edit
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !isChanged || !form.date || !form.time || allSlotsWithStatus.find(x => x.time === form.time)?.status !== 'available'}
                                className="flex-[2] py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-[var(--accent-subtle)] active:scale-95 disabled:opacity-40 disabled:shadow-none"
                                style={{ background: 'linear-gradient(135deg, #3BACED, #1E87C8)' }}
                            >
                                {isSaving ? 'Saving Changes...' : 'Update Schedule'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
