import { useState, useEffect, useMemo } from 'react';
import { Search, UserPlus, Settings, X, Check, ChevronDown, History, CheckSquare, Square } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { addLog, fetchOfficersFromDB, assignOfficerDB, removeOfficerDB, updateOfficerPermissionsDB, fetchUsersFromDB } from '../store';
import { supabase } from '../lib/supabase';
import { notifyIndividual } from '../lib/notifications';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import type { Officer, SystemUser } from '../types';

// ---- Access Config Modal ----
function AccessModal({ officer, onClose }: { officer: Officer; onClose: () => void }) {
    const state = useStore();
    const availableCampuses = state.campuses || [];
    const availableClinics = (state.clinics || []).filter(c => c.campusId === officer.campus);

    const [campus, setCampus] = useState<string>(officer.campus || availableCampuses[0]?.id || '');
    const [clinic, setClinic] = useState<string>(officer.clinic || availableClinics[0]?.id || '');
    const [perms, setPerms] = useState<string[]>(officer.permissions || []);
    const [dutyStart, setDutyStart] = useState(officer.dutyStart);
    const [dutyEnd, setDutyEnd] = useState(officer.dutyEnd);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const clinicsForCampus = (state.clinics || []).filter(c => c.campusId === campus);
        if (clinicsForCampus.length > 0 && !clinicsForCampus.find(c => c.id === clinic)) {
            setClinic(clinicsForCampus[0].id);
        } else if (clinicsForCampus.length === 0) {
            setClinic('');
        }
    }, [campus, state.clinics]);

    const [showConfirm, setShowConfirm] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateOfficerPermissionsDB(officer.id, perms);
            const { error } = await supabase.from('officers').update({
                duty_start: dutyStart,
                duty_end: dutyEnd,
                campus: campus,
                clinic: clinic
            }).eq('id', officer.id);

            if (error) throw error;
            await fetchOfficersFromDB();
            await addLog('Admin', `Updated Officer settings for ${officer.fullName} (${officer.studentId})`);
            await notifyIndividual(
                officer.userId,
                'Duty Configuration Updated',
                `Your duty settings (hours/location) have been updated by the clinic administrator.`,
                'duty_assignment',
                officer.id
            );
            onClose();
        } catch (e) {
            alert('Failed to update officer.');
        } finally {
            setSaving(false);
            setShowConfirm(false);
        }
    };

    const togglePerm = (key: string) => {
        setPerms((p) => p.includes(key) ? p.filter(x => x !== key) : [...p, key]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-2xl shadow-2xl w-full max-w-md fade-in" style={{ background: 'var(--card-bg)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Configure Access</h2>
                        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{officer.fullName} · {officer.studentId}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ color: 'var(--text-muted)' }}
                        onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-wash)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="p-5 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Duty Start</label>
                            <input type="time" value={dutyStart} onChange={(e) => setDutyStart(e.target.value)}
                                className="w-full rounded-xl px-4 py-2.5 text-[15px] outline-none"
                                style={{ border: '1px solid var(--border)', background: 'var(--bg-wash)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Duty End</label>
                            <input type="time" value={dutyEnd} onChange={(e) => setDutyEnd(e.target.value)}
                                className="w-full rounded-xl px-4 py-2.5 text-[15px] outline-none"
                                style={{ border: '1px solid var(--border)', background: 'var(--bg-wash)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[15px] font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Assigned Campus</label>
                            <div className="relative">
                                <select value={campus} onChange={(e) => setCampus(e.target.value)}
                                    className="w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-[15px] outline-none"
                                    style={{ border: '1px solid var(--border)', background: 'var(--bg-wash)', color: 'var(--text-primary)' }}
                                >
                                    {availableCampuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    {availableCampuses.length === 0 && <option value="">No Campuses</option>}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[15px] font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Assigned Clinic</label>
                            <div className="relative">
                                <select value={clinic} onChange={(e) => setClinic(e.target.value)} disabled={!campus}
                                    className="w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-[15px] outline-none disabled:opacity-50"
                                    style={{ border: '1px solid var(--border)', background: 'var(--bg-wash)', color: 'var(--text-primary)' }}
                                >
                                    {(state.clinics || []).filter(c => c.campusId === campus).map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                    {(state.clinics || []).filter(c => c.campusId === campus).length === 0 && (
                                        <option value="">No Clinics</option>
                                    )}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>Module Permissions</label>
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); setPerms(perms.length === 4 ? [] : ['appointments', 'medical requests', 'inquiries', 'inventory']); }}
                                className="text-[12px] font-medium px-2 py-1 rounded-md uppercase tracking-wider transition-colors"
                                style={{ color: 'var(--accent)', background: 'var(--accent-light)' }}
                            >
                                {perms.length === 4 ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="space-y-3">
                            {['appointments', 'medical requests', 'inquiries', 'inventory'].map((key) => (
                                <label
                                    key={key}
                                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                                    style={{ border: '1px solid var(--border)' }}
                                    onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-wash)'; }}
                                    onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                >
                                    <div
                                        onClick={() => togglePerm(key)}
                                        className="w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors cursor-pointer"
                                        style={{
                                            borderColor: perms.includes(key) ? 'var(--accent)' : 'var(--border)',
                                            background: perms.includes(key) ? 'var(--accent)' : 'transparent',
                                        }}
                                    >
                                        {perms.includes(key) && <Check size={12} color="white" strokeWidth={3} />}
                                    </div>
                                    <span className="text-[15px] font-normal capitalize" style={{ color: 'var(--text-primary)' }}>
                                        {key}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 px-5 pb-5">
                    <button onClick={() => setShowConfirm(true)} disabled={saving}
                        className="btn-cta flex-1 py-2.5 rounded-xl text-[15px] font-medium text-white disabled:opacity-50"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>

            <ConfirmationDialog
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleSave}
                title="Update Duty Assignment"
                description={`Are you sure you want to save changes to ${officer.fullName}'s duty schedule and access permissions?`}
                confirmText="Save Changes"
                isLoading={saving}
                type="info"
            />
        </div>
    );
}

// ---- Officer Logs Modal (UI ONLY) ----
function OfficerLogsModal({ onClose }: { onClose: () => void }) {
    const mockLogs = [
        { id: 1, officer: 'Nurse Joy', action: 'Accepted appointment for Student #12345', time: '10:30 AM', date: 'Today' },
        { id: 2, officer: 'Dr. Brock', action: 'Dispensed Paracetamol to Student #67890', time: '11:15 AM', date: 'Today' },
        { id: 3, officer: 'Nurse Joy', action: 'Updated patient record for Juan Dela Cruz', time: '01:45 PM', date: 'Today' },
        { id: 4, officer: 'Dr. Misty', action: 'Approved Medical Certificate request #998', time: '03:10 PM', date: 'Today' },
        { id: 5, officer: 'Nurse Joy', action: 'Scheduled follow-up for Maria Clara', time: '04:00 PM', date: 'Today' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-2xl shadow-2xl w-full max-w-2xl fade-in overflow-hidden" style={{ background: 'var(--card-bg)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-wash)', color: 'var(--text-secondary)' }}>
                            <History size={20} />
                        </div>
                        <div>
                            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Officer Activity Logs</h2>
                            <p className="text-[12px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Recent actions across all modules</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ color: 'var(--text-muted)' }}
                        onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-wash)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="mobile-card-table p-0 max-h-[400px] overflow-y-auto">
                    <table className="w-full zebra-table">
                        <thead>
                            <tr style={{ background: 'var(--bg-wash)', borderBottom: '1px solid var(--border)' }}>
                                <th className="text-left text-[10px] font-black uppercase tracking-widest px-6 py-3" style={{ color: 'var(--text-muted)' }}>Officer</th>
                                <th className="text-left text-[10px] font-black uppercase tracking-widest px-6 py-3" style={{ color: 'var(--text-muted)' }}>Action</th>
                                <th className="text-right text-[10px] font-black uppercase tracking-widest px-6 py-3" style={{ color: 'var(--text-muted)' }}>Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockLogs.map((log) => (
                                <tr key={log.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td data-label="Officer" className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-medium italic"
                                                style={{ background: 'var(--bg-wash)', color: 'var(--text-muted)' }}>
                                                {log.officer.split(' ').map(n=>n[0]).join('')}
                                            </div>
                                            <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{log.officer}</span>
                                        </div>
                                    </td>
                                    <td data-label="Action" className="px-6 py-4">
                                        <span className="text-[13px] font-normal" style={{ color: 'var(--text-secondary)' }}>{log.action}</span>
                                    </td>
                                    <td data-label="Timestamp" className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{log.date}</span>
                                            <span className="text-[12px] font-normal" style={{ color: 'var(--text-faint)' }}>{log.time}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>


            </div>
        </div>
    );
}

// ---- Assign Confirm Modal ----
function AssignModal({ user, onConfirm, onClose }: {
    user: SystemUser;
    onConfirm: (campus: string, clinic: string, perms: string[], start: string, end: string, date: string) => void;
    onClose: () => void
}) {
    const state = useStore();
    const availableCampuses = state.campuses || [];
    
    const now = new Date();
    const isPast5PM = now.getHours() >= 17;
    const todayStr = now.toISOString().split('T')[0];
    const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
    const minDateAvailable = isPast5PM ? tomorrowStr : todayStr;

    const [campus, setCampus] = useState<string>(availableCampuses[0]?.id || '');
    const [clinic, setClinic] = useState<string>('');
    const [perms, setPerms] = useState<string[]>([]);
    const [dutyStart, setDutyStart] = useState('07:00');
    const [dutyEnd, setDutyEnd] = useState('17:00');
    const [assignedDate, setAssignedDate] = useState<string>(minDateAvailable);

    useEffect(() => {
        const clinicsForCampus = (state.clinics || []).filter(c => c.campusId === campus);
        if (clinicsForCampus.length > 0 && !clinicsForCampus.find(c => c.id === clinic)) {
            setClinic(clinicsForCampus[0].id);
        } else if (clinicsForCampus.length === 0) {
            setClinic('');
        }
    }, [campus, state.clinics]);

    const togglePerm = (key: string) => {
        setPerms((p) => p.includes(key) ? p.filter(x => x !== key) : [...p, key]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-2xl shadow-2xl w-full max-w-md fade-in" style={{ background: 'var(--card-bg)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Assign as Officer</h2>
                            <span className="text-[12px] font-semibold px-2 py-1 rounded-lg ml-3"
                                style={{ color: 'var(--accent)', background: 'var(--accent-light)' }}>
                                {new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>
                        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{user.fullName} · {user.studentId}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ color: 'var(--text-muted)' }}
                        onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-wash)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                             <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Assigned Date</label>
                             <input 
                                type="date" 
                                value={assignedDate} 
                                min={minDateAvailable}
                                onChange={(e) => setAssignedDate(e.target.value)}
                                className="w-full rounded-xl px-4 py-2.5 text-[15px] outline-none"
                                style={{ border: '1px solid var(--border)', background: 'var(--bg-wash)', color: 'var(--text-primary)' }}
                             />
                             {isPast5PM && assignedDate === todayStr && (
                                 <p className="text-[11px] text-red-500 mt-1 font-medium">Duty day ended (past 5 PM). Please select tomorrow or later.</p>
                             )}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Duty Start</label>
                            <input type="time" value={dutyStart} onChange={(e) => setDutyStart(e.target.value)}
                                className="w-full rounded-xl px-4 py-2.5 text-[15px] outline-none"
                                style={{ border: '1px solid var(--border)', background: 'var(--bg-wash)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Duty End</label>
                            <input type="time" value={dutyEnd} onChange={(e) => setDutyEnd(e.target.value)}
                                className="w-full rounded-xl px-4 py-2.5 text-[15px] outline-none"
                                style={{ border: '1px solid var(--border)', background: 'var(--bg-wash)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[15px] font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Assign to Campus</label>
                            <div className="relative">
                                <select value={campus} onChange={(e) => setCampus(e.target.value)}
                                    className="w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-[15px] outline-none"
                                    style={{ border: '1px solid var(--border)', background: 'var(--bg-wash)', color: 'var(--text-primary)' }}
                                >
                                    {availableCampuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    {availableCampuses.length === 0 && <option value="">No Campuses</option>}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[15px] font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Assign to Clinic</label>
                            <div className="relative">
                                <select value={clinic} onChange={(e) => setClinic(e.target.value)} disabled={!campus}
                                    className="w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-[15px] outline-none disabled:opacity-50"
                                    style={{ border: '1px solid var(--border)', background: 'var(--bg-wash)', color: 'var(--text-primary)' }}
                                >
                                    {(state.clinics || []).filter(c => c.campusId === campus).map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                    {(state.clinics || []).filter(c => c.campusId === campus).length === 0 && (
                                        <option value="">No Clinics</option>
                                    )}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>Module Permissions</label>
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); setPerms(perms.length === 4 ? [] : ['appointments', 'medical requests', 'inquiries', 'inventory']); }}
                                className="text-[12px] font-medium px-2 py-1 rounded-md uppercase tracking-wider transition-colors"
                                style={{ color: 'var(--accent)', background: 'var(--accent-light)' }}
                            >
                                {perms.length === 4 ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="space-y-3">
                            {['appointments', 'medical requests', 'inquiries', 'inventory'].map((key) => (
                                <label
                                    key={key}
                                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                                    style={{ border: '1px solid var(--border)' }}
                                    onClick={(e) => { e.preventDefault(); togglePerm(key); }}
                                    onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-wash)'; }}
                                    onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                >
                                    <div
                                        className="w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors cursor-pointer"
                                        style={{
                                            borderColor: perms.includes(key) ? 'var(--accent)' : 'var(--border)',
                                            background: perms.includes(key) ? 'var(--accent)' : 'transparent',
                                        }}
                                    >
                                        {perms.includes(key) && <Check size={12} color="white" strokeWidth={3} />}
                                    </div>
                                    <span className="text-[15px] font-normal capitalize" style={{ color: 'var(--text-primary)' }}>
                                        {key}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 px-5 pb-5">
                    <button
                        onClick={() => onConfirm(campus, clinic, perms, dutyStart, dutyEnd, assignedDate)}
                        disabled={isPast5PM && assignedDate === todayStr}
                        className="flex-1 py-3 rounded-xl text-[13px] font-bold uppercase tracking-[0.1em] transition-all active:scale-95 disabled:opacity-40"
                        style={{ color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid rgba(72,187,238,0.25)' }}
                    >
                        Confirm Assignment
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---- Random Pick Modal ----
function RandomPickModal({ students, setStudents, onClose, onBulkAdd, isSubmitting }: {
    students: (SystemUser & { selected: boolean })[];
    setStudents: React.Dispatch<React.SetStateAction<(SystemUser & { selected: boolean })[] | null>>;
    onClose: () => void;
    onBulkAdd: (campus: string, clinic: string, perms: string[], start: string, end: string, date: string) => Promise<void>;
    isSubmitting: boolean;
}) {
    const state = useStore();
    const availableCampuses = state.campuses || [];
    
    // Copy settings from AssignModal logic
    const now = new Date();
    const isPast5PM = now.getHours() >= 17;
    const todayStr = now.toISOString().split('T')[0];
    const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
    const minDateAvailable = isPast5PM ? tomorrowStr : todayStr;

    const [campus, setCampus] = useState<string>(availableCampuses[0]?.id || '');
    const [clinic, setClinic] = useState<string>('');
    const [perms] = useState<string[]>(['appointments', 'medical requests', 'inquiries', 'inventory']); // Default all for random picks
    const [dutyStart, setDutyStart] = useState('07:00');
    const [dutyEnd, setDutyEnd] = useState('17:00');
    const [assignedDate, setAssignedDate] = useState<string>(minDateAvailable);

    useEffect(() => {
        const clinicsForCampus = (state.clinics || []).filter(c => c.campusId === campus);
        if (clinicsForCampus.length > 0 && !clinicsForCampus.find(c => c.id === clinic)) {
            setClinic(clinicsForCampus[0].id);
        } else if (clinicsForCampus.length === 0) {
            setClinic('');
        }
    }, [campus, state.clinics]);

    const toggleStudent = (index: number) => {
        setStudents(prev => {
            if (!prev) return null;
            const next = [...prev];
            next[index] = { ...next[index], selected: !next[index].selected };
            return next;
        });
    };

    const toggleAll = () => {
        const allSelected = students.every(s => s.selected);
        setStudents(prev => prev ? prev.map(s => ({ ...s, selected: !allSelected })) : null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-2xl shadow-2xl w-full max-w-2xl fade-in flex flex-col max-h-[90vh]" style={{ background: 'var(--card-bg)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Random Officer Candidates</h2>
                        <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>Found {students.length} matching candidates. Configure their shared duty settings below.</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-slate-100" style={{ color: 'var(--text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-[12px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Assigned Date</label>
                             <input type="date" value={assignedDate} min={minDateAvailable} onChange={(e) => setAssignedDate(e.target.value)}
                                className="w-full rounded-xl px-4 py-2.5 text-[15px] outline-none border"
                                style={{ background: 'var(--bg-wash)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                             />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[12px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Start</label>
                                <input type="time" value={dutyStart} onChange={(e) => setDutyStart(e.target.value)}
                                    className="w-full rounded-xl px-3 py-2.5 text-[15px] outline-none border"
                                    style={{ background: 'var(--bg-wash)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>End</label>
                                <input type="time" value={dutyEnd} onChange={(e) => setDutyEnd(e.target.value)}
                                    className="w-full rounded-xl px-3 py-2.5 text-[15px] outline-none border"
                                    style={{ background: 'var(--bg-wash)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-[12px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Campus</label>
                             <select value={campus} onChange={(e) => setCampus(e.target.value)}
                                className="w-full rounded-xl px-4 py-2.5 text-[15px] outline-none border appearance-none"
                                style={{ background: 'var(--bg-wash)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                             >
                                {availableCampuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                             </select>
                        </div>
                        <div>
                             <label className="block text-[12px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Clinic</label>
                             <select value={clinic} onChange={(e) => setClinic(e.target.value)}
                                className="w-full rounded-xl px-4 py-2.5 text-[15px] outline-none border appearance-none"
                                style={{ background: 'var(--bg-wash)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                             >
                                {(state.clinics || []).filter(c => c.campusId === campus).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                             </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-400">Candidate List</h3>
                            <button onClick={toggleAll} className="text-[12px] font-bold uppercase tracking-widest text-emerald-500 hover:opacity-70">
                                {students.every(s => s.selected) ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {students.map((student, idx) => (
                                <div 
                                    key={student.id}
                                    onClick={() => toggleStudent(idx)}
                                    className="flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-emerald-200"
                                    style={{ 
                                        background: student.selected ? 'var(--accent-light)' : 'var(--bg-wash)',
                                        borderColor: student.selected ? 'var(--accent)' : 'var(--border)'
                                    }}
                                >
                                    <div className="text-emerald-600 transition-colors">
                                        {student.selected ? <CheckSquare size={20} /> : <Square size={20} className="opacity-30" />}
                                    </div>
                                    <div>
                                        <p className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>{student.fullName}</p>
                                        <p className="text-[12px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>{student.studentId}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t flex gap-3" style={{ background: 'var(--bg-wash)', borderTop: '1px solid var(--border)' }}>
                    <button 
                        onClick={() => onBulkAdd(campus, clinic, perms, dutyStart, dutyEnd, assignedDate)}
                        disabled={isSubmitting || students.filter(s => s.selected).length === 0}
                        className="btn-cta flex-1 py-4 rounded-2xl text-[13px] font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
                    >
                        {isSubmitting ? 'Processing Bulk Assignment...' : `Add ${students.filter(s => s.selected).length} Selected as Officers`}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---- Main Duty Page ----
export default function Duty() {
    const state = useStore();
    const [search, setSearch] = useState('');
    const [assignModal, setAssignModal] = useState<SystemUser | null>(null);
    const [confirmAssignData, setConfirmAssignData] = useState<any>(null);
    const [accessModal, setAccessModal] = useState<Officer | null>(null);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [dateFilter, setDateFilter] = useState('ALL');
    const [randomPickCount, setRandomPickCount] = useState<number>(1);
    const [pickedStudents, setPickedStudents] = useState<(SystemUser & { selected: boolean })[] | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [confirmRemove, setConfirmRemove] = useState<Officer | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const itemsPerPage = 10;

    const handleRandomPick = () => {
        const officerUserIds = new Set(state.officers.map(o => o.userId));
        const eligibleUsers = state.users.filter(u => !officerUserIds.has(u.id));

        if (eligibleUsers.length === 0) {
            alert("No available users to pick from.");
            return;
        }

        const countToPick = Math.min(randomPickCount, eligibleUsers.length);
        const shuffled = [...eligibleUsers].sort(() => 0.5 - Math.random());
        const picked = shuffled.slice(0, countToPick).map(u => ({ ...u, selected: true }));

        setPickedStudents(picked);
    };

    const handleBulkAssign = async (campus: string, clinic: string, perms: string[], start: string, end: string, assignedDate: string) => {
        if (!pickedStudents) return;
        const selected = pickedStudents.filter(s => s.selected);
        if (selected.length === 0) {
            alert("No students selected to add.");
            return;
        }

        setIsSubmitting(true);
        try {
            for (const user of selected) {
                await assignOfficerDB({
                    userId: user.id,
                    fullName: user.fullName,
                    studentId: user.studentId,
                    dutyStart: start,
                    dutyEnd: end,
                    permissions: perms,
                    campus: campus,
                    clinic: clinic,
                    assignedAt: assignedDate,
                    password: user.birthdate // Insert birthdate as initial password
                });

                await addLog('Admin', `Bulk Assigned Officer role to ${user.fullName} (${user.studentId})`);
                await notifyIndividual(
                    user.id,
                    'Duty Assignment (Bulk)',
                    `You have been assigned as a MedSync Officer via bulk selection. Your schedule is from ${start} to ${end}.`,
                    'duty_assignment',
                    user.id // In bulk, we might not have the new officer ID immediately for notification, but this works
                );
            }
            setPickedStudents(null);
            setSearch('');
        } catch (e) {
            alert('An error occurred during bulk assignment. Some users might not have been added.');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        fetchUsersFromDB();
        fetchOfficersFromDB();
    }, []);

    const uniqueDates = useMemo(() => {
        const dates = Array.from(new Set(state.officers.map(o => o.assignedAt).filter(Boolean))) as string[];
        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        return dates.sort((a, b) => {
            if (a === todayStr) return -1;
            if (b === todayStr) return 1;
            if (a === tomorrowStr) return -1;
            if (b === tomorrowStr) return 1;
            return new Date(a).getTime() - new Date(b).getTime();
        });
    }, [state.officers]);

    const filteredOfficers = useMemo(() => {
        return state.officers.filter(o => {
            const matchesDate = dateFilter === 'ALL' || o.assignedAt === dateFilter;
            return matchesDate;
        });
    }, [state.officers, dateFilter]);

    const totalPages = Math.ceil(filteredOfficers.length / itemsPerPage);
    const paginatedOfficers = filteredOfficers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [dateFilter, search]);

    const searchResults = useMemo(() => {
        if (search.trim().length < 2) return [];
        const officerUserIds = state.officers.map(o => o.userId);
        return state.users
            .filter((u) => !officerUserIds.includes(u.id)) // Only show users NOT already assigned
            .filter((u) => (
                u.fullName.toLowerCase().includes(search.toLowerCase()) || 
                u.studentId.toLowerCase().includes(search.toLowerCase())
            )).slice(0, 10);
    }, [search, state.users, state.officers]);

    const handleAssign = async (user: SystemUser, campus: string, clinic: string, perms: string[], start: string, end: string, assignedDate: string) => {
        setIsSubmitting(true);

        try {
            const result = await assignOfficerDB({
                userId: user.id,
                fullName: user.fullName,
                studentId: user.studentId,
                dutyStart: start,
                dutyEnd: end,
                permissions: perms,
                campus: campus,
                clinic: clinic,
                assignedAt: assignedDate,
                password: user.birthdate // Insert birthdate as initial password
            });

            await addLog('Admin', `Assigned Officer role to ${user.fullName} (${user.studentId}) — Schedule: ${start}-${end}`);
            
            await notifyIndividual(
                user.id,
                'Duty Assignment',
                `You have been assigned as a MedSync Officer. Your schedule is from ${start} to ${end}.`,
                'duty_assignment',
                (result as any)?.[0]?.id || user.id
            );

            setAssignModal(null);
            setConfirmAssignData(null);
            setSearch('');
        } catch (e) {
            alert('Failed to assign officer. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveOfficer = async () => {
        if (!confirmRemove) return;
        setIsSubmitting(true);
        try {
            await removeOfficerDB(confirmRemove.id);
            addLog('Admin', `Removed Officer role from ${confirmRemove.fullName} (${confirmRemove.studentId})`);
            setConfirmRemove(null);
        } catch (e) {
            alert('Failed to remove officer.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const fmtTime = (time24: string) => {
        if (!time24) return 'N/A';
        const [h, m] = time24.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Duty Assignment</h2>
                <p className="text-[15px] mt-1 font-medium opacity-70" style={{ color: 'var(--text-secondary)' }}>Assign Officer roles and configure module permissions.</p>
            </div>

            {/* Search Bar */}
            <div className="rounded-2xl p-4 flex flex-col md:flex-row flex-wrap items-stretch md:items-center justify-between gap-4 transition-colors" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="relative flex-1 min-w-full md:min-w-[280px] md:max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search users to assign by name or ID..."
                        className="w-full pl-10 pr-3 py-2.5 text-[15px] rounded-xl outline-none font-normal transition-colors"
                        style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border)' }}>
                        <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Pick</span>
                        <input 
                            type="number" 
                            min={1} 
                            max={50}
                            value={randomPickCount}
                            onChange={(e) => setRandomPickCount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-12 bg-transparent text-[15px] font-bold outline-none text-center"
                            style={{ color: 'var(--text-primary)' }}
                        />
                        <button 
                            onClick={handleRandomPick}
                            className="px-3 py-1 rounded-lg text-[12px] font-bold uppercase tracking-widest transition-all active:scale-95"
                            style={{ background: 'var(--accent)', color: 'white' }}
                        >
                            Random Select
                        </button>
                    </div>
                    <button 
                        onClick={() => setShowLogsModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold uppercase tracking-widest transition-all shadow-sm"
                        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                        onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-wash)'; e.currentTarget.style.borderColor = 'var(--border-focus)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'var(--card-bg)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                        <History size={16} /> Officers Logs
                    </button>
                </div>
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
                <button 
                    onClick={() => setDateFilter('ALL')}
                    className="px-5 py-2.5 rounded-2xl text-[12px] font-bold uppercase tracking-widest transition-all shadow-sm border whitespace-nowrap"
                    style={dateFilter === 'ALL' ? {
                        background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)'
                    } : {
                        background: 'var(--card-bg)', color: 'var(--text-muted)', borderColor: 'var(--border)'
                    }}
                >
                    All Officers
                </button>
                {uniqueDates.map(date => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                    const isToday = date === todayStr;
                    const isTomorrow = date === tomorrowStr;
                    
                    const label = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
                    
                    const activeStyle = isToday ? { background: 'var(--warning)', color: 'white', borderColor: 'var(--warning)' } : { background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' };
                    const inactiveStyle = isToday ? { background: 'var(--warning-bg)', color: 'var(--warning-text)', borderColor: 'rgba(245,158,11,0.2)' } : { background: 'var(--card-bg)', color: 'var(--text-muted)', borderColor: 'var(--border)' };

                    return (
                        <button
                            key={date}
                            onClick={() => setDateFilter(date)}
                            className="px-5 py-2.5 rounded-2xl text-[12px] font-bold uppercase tracking-widest transition-all shadow-sm border whitespace-nowrap"
                            style={dateFilter === date ? activeStyle : inactiveStyle}
                        >
                            {label}
                        </button>
                    )
                })}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
                <div className="space-y-2 fade-in p-4 rounded-2xl shadow-sm transition-colors" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <h4 className="text-[12px] font-bold uppercase tracking-widest mb-3 ml-1" style={{ color: 'var(--text-faint)' }}>Search Results</h4>
                    {searchResults.map((u) => (
                        <div
                            key={u.id}
                            className="flex items-center justify-between p-3 rounded-xl transition-all"
                            style={{ border: '1px solid var(--border-light)', background: 'var(--bg-wash)' }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold shadow-sm"
                                    style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-subtle)' }}>
                                    {u.fullName.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{u.fullName}</span>
                                    <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{u.studentId}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setAssignModal(u)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all active:scale-95"
                                style={{ color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid var(--accent-subtle)' }}
                            >
                                <UserPlus size={14} /> Add as Officer
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {search.trim().length >= 2 && searchResults.length === 0 && (
                <div className="p-6 rounded-2xl shadow-sm text-center transition-colors" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <p className="text-[15px] font-medium" style={{ color: 'var(--text-faint)' }}>No eligible users found for "{search}"</p>
                </div>
            )}

            {/* Officers Table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                    <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Assigned Officers</h3>
                    <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{state.officers.length} total</span>
                </div>
                <div className="mobile-card-table w-full overflow-x-auto">
                    <table className="w-full zebra-table">
                    <thead>
                        <tr style={{ background: 'var(--bg-wash)', borderBottom: '1px solid var(--border)' }}>
                            {['Officer Info', 'Location', 'Duty Status', 'Permissions', 'Actions'].map((h) => (
                                <th key={h} className="text-left text-[12px] font-bold uppercase tracking-widest px-6 py-4" style={{ color: 'var(--text-muted)' }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedOfficers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center text-[15px] py-20 italic font-medium" style={{ color: 'var(--text-faint)' }}>No officers assigned yet.</td>
                            </tr>
                        ) : (
                            paginatedOfficers.map((officer) => (
                                <tr key={officer.id} className="transition-colors group text-[15px]" style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td data-label="Officer Info" className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold shadow-sm"
                                                style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid rgba(72,187,238,0.1)' }}>
                                                {officer.fullName.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-[15px]" style={{ color: 'var(--text-primary)' }}>{officer.fullName}</span>
                                                <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>ID: {officer.studentId}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td data-label="Location" className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{state.campuses.find(c => c.id === officer.campus)?.name || 'Unassigned'}</p>
                                            <p className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>{state.clinics.find(c => c.id === officer.clinic)?.name || 'No Clinic'}</p>
                                        </div>
                                    </td>
                                    <td data-label="Duty Status" className="px-6 py-4">
                                        <div className="flex flex-col gap-1 items-start">
                                            <span className="text-[12px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm"
                                                style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid rgba(229,168,50,0.1)' }}>
                                                {fmtTime(officer.dutyStart)} - {fmtTime(officer.dutyEnd)}
                                            </span>
                                            {officer.assignedAt && <span className="text-[11px] font-bold pl-1 uppercase" style={{ color: 'var(--text-faint)' }}>Since {new Date(officer.assignedAt).toLocaleDateString()}</span>}
                                        </div>
                                    </td>
                                    <td data-label="Permissions" className="px-6 py-4">
                                        <div className="flex gap-1.5 flex-wrap">
                                            {officer.permissions.map((k) => (
                                                <span key={k} className="text-[12px] px-2.5 py-1 rounded-lg capitalize font-bold tracking-tight shadow-xs"
                                                    style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(52,211,153,0.1)' }}>
                                                    {k}
                                                </span>
                                            ))}
                                            {officer.permissions.length === 0 && (
                                                <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>None</span>
                                            )}
                                        </div>
                                    </td>
                                    <td data-label="Actions" className="px-6 py-4 text-right">
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => setAccessModal(officer)}
                                                className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-all"
                                                style={{ color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid rgba(72,187,238,0.15)' }}
                                            >
                                                <Settings size={12} /> Access
                                            </button>
                                            <button
                                                onClick={() => setConfirmRemove(officer)}
                                                className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-all"
                                                style={{ color: 'var(--danger)', background: 'var(--danger-bg)', border: '1px solid rgba(226,92,92,0.15)' }}
                                            >
                                                <X size={12} /> Remove
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                </div>
                {/* Pagination */}
                <div className="px-6 py-4 flex items-center justify-between"
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

            {assignModal && (
                <AssignModal
                    user={assignModal}
                    onConfirm={(campus: string, clinic: string, perms: string[], start: string, end: string, date: string) => setConfirmAssignData({ campus, clinic, perms, start, end, date })}
                    onClose={() => setAssignModal(null)}
                />
            )}

            <ConfirmationDialog
                isOpen={!!confirmAssignData}
                title="Confirm Officer Assignment"
                description={`Are you sure you want to assign ${assignModal?.fullName} as a MedSync Officer? This will grant them special access permissions.`}
                onClose={() => setConfirmAssignData(null)}
                onConfirm={() => {
                    if (assignModal && confirmAssignData) {
                        handleAssign(
                            assignModal,
                            confirmAssignData.campus,
                            confirmAssignData.clinic,
                            confirmAssignData.perms,
                            confirmAssignData.start,
                            confirmAssignData.end,
                            confirmAssignData.date
                        );
                    }
                }}
                isLoading={isSubmitting}
                type="info"
            />

            <ConfirmationDialog
                isOpen={!!confirmRemove}
                title="Remove Officer"
                description={`Are you sure you want to remove ${confirmRemove?.fullName} from officer duties? This action cannot be undone.`}
                onClose={() => setConfirmRemove(null)}
                onConfirm={handleRemoveOfficer}
                isLoading={isSubmitting}
                type="danger"
                confirmText="Remove Officer"
            />

            {accessModal && (
                <AccessModal officer={accessModal} onClose={() => setAccessModal(null)} />
            )}
            {showLogsModal && (
                <OfficerLogsModal onClose={() => setShowLogsModal(false)} />
            )}
            {pickedStudents && (
                <RandomPickModal
                    students={pickedStudents}
                    setStudents={setPickedStudents}
                    onClose={() => setPickedStudents(null)}
                    onBulkAdd={handleBulkAssign}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
}

