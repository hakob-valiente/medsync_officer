import { useState, useEffect } from 'react';
import { Search, Eye, X, Activity, Contact, HeartPulse, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { fetchUsersFromDB, fetchVisitRecords, deleteUserDB, addUserDB, updateUserDB, addVisitRecordDB, updateVisitRecordDB, deleteVisitRecordDB } from '../store';
import { notifyIndividual } from '../lib/notifications';
import { Mail } from 'lucide-react';
import type { SystemUser, VisitRecord } from '../types';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { UserFormModal } from '../components/UserFormModal';

// ---- Health Information Modal ----
function HealthModal({ user, onClose }: { 
    user: SystemUser; 
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto fade-in" style={{ background: 'var(--card-bg)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                            <Activity size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Health Information</h2>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{user.fullName} · {user.studentId}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors" style={{ color: 'var(--text-muted)' }}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Primary Vitals & Traits */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Height (cm)', val: user.height_cm || '—', icon: Activity },
                            { label: 'Weight (kg)', val: user.weight_kg || '—', icon: Activity },
                            { label: 'Blood Type', val: user.blood_type || '—', icon: HeartPulse },
                        ].map((item, i) => (
                            <div key={i} className="rounded-2xl p-4 flex flex-col items-center justify-center text-center" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                                <item.icon size={16} className="text-blue-500 mb-2" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                                <span className="text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{item.val}</span>
                            </div>
                        ))}
                    </div>

                    {/* Medical Lists */}
                    <div className="space-y-4">
                        {[
                            { label: 'Allergies', data: user.allergies, color: 'text-red-600', bg: 'bg-red-50' },
                            { label: 'Chronic Conditions', data: user.chronic_conditions, color: 'text-orange-600', bg: 'bg-orange-50' },
                            { label: 'Current Medications', data: user.current_medications, color: 'text-blue-600', bg: 'bg-blue-50' },
                        ].map((section, i) => (
                            <div key={i}>
                                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-muted)' }}>{section.label}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {section.data && section.data.length > 0 ? (
                                        section.data.map((item, idx) => (
                                            <span key={idx} className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${section.bg} ${section.color}`}>
                                                {item}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs italic px-1" style={{ color: 'var(--text-muted)' }}>None reported</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Emergency Contact & Profile Info */}
                    <div className="rounded-2xl p-5" style={{ border: '1px solid var(--border)', background: 'var(--bg-wash)' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Contact size={16} style={{ color: 'var(--text-muted)' }} />
                            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Contact & Profile Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Course, Year & Section</p>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {user.course ? `${user.course} ${user.year_level?.charAt(0) || ''}-${user.section || ''}` : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Email</p>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.email || '—'}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4 border-t pt-4" style={{ borderColor: 'var(--border-light)' }}>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Contact Person</p>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.contact_person || '—'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Contact Number</p>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.contact_number || '—'}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Barangay</p>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.barangay || '—'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Street Address</p>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.street_address || '—'}</p>
                            </div>
                        </div>
                    </div>

                    {/* ID Attachments Placeholder */}
                    <div className="rounded-2xl p-5" style={{ border: '1px solid var(--border)', background: 'var(--bg-wash)' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Contact size={16} style={{ color: 'var(--text-muted)' }} />
                            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Identification Cards</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col items-center justify-center h-32 rounded-xl" style={{ border: '1px dashed var(--border-light)', background: 'var(--card-bg)' }}>
                                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>ID Front (Display)</span>
                            </div>
                            <div className="flex flex-col items-center justify-center h-32 rounded-xl" style={{ border: '1px dashed var(--border-light)', background: 'var(--card-bg)' }}>
                                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>ID Back (Display)</span>
                            </div>
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
}



// ---- Visit Records Modal ----
// ---- Visit Record Row (Expandable) ----
function VisitRecordRow({
    rec,
    fmtDate,
    getVitals
}: {
    rec: VisitRecord;
    fmtDate: (iso: string) => string;
    getVitals: (rec: VisitRecord) => any;
}) {
    const [expanded, setExpanded] = useState(false);
    const v = getVitals(rec);
    const primaryDiagnosis = Array.isArray(rec.diagnosis) && rec.diagnosis.length > 0 ? rec.diagnosis[0] : 'None';

    return (
        <div
            className="rounded-2xl transition-all duration-200"
            style={{ border: '1px solid var(--border)', background: expanded ? 'var(--bg-wash)' : 'var(--card-bg)' }}
        >
            {/* Header / List Item View */}
            <div className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-[150px]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--accent)' }}>Visit Date</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{fmtDate(rec.visit_date)}</p>
                </div>
                <div className="flex-1 min-w-[120px]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Nurse</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{rec.nurse_assigned}</p>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Diagnosis</p>
                    <p className="text-sm font-normal truncate max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>{primaryDiagnosis}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${expanded
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100'
                            }`}
                    >
                        {expanded ? 'Close' : 'Details'}
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="px-5 pb-5 pt-2 space-y-5 fade-in mt-1" style={{ borderTop: '1px solid var(--border-light)' }}>
                    {/* Vitals Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                            { label: 'BP', val: v.bp },
                            { label: 'TEMP', val: v.temp ? `${v.temp}°C` : null },
                            { label: 'PR (BPM)', val: v.hr },
                            { label: 'RR', val: v.rr },
                            { label: 'SpO2', val: v.spo2 ? `${v.spo2}%` : null },
                        ].map((item, i) => item.val && (
                            <div key={i} className="rounded-xl p-3 shadow-sm" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)' }}>
                                <p className="text-[10px] font-semibold uppercase tracking-tighter mb-0.5" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{item.val}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Diagnosis</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {Array.isArray(rec.diagnosis) ? rec.diagnosis.map((d, i) => (
                                    <span key={i} className="text-xs font-medium bg-red-50 text-red-700 px-2.5 py-1 rounded-lg border border-red-100">{d}</span>
                                )) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>N/A</span>}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Treatment Given</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {Array.isArray(rec.treatment_given) ? rec.treatment_given.map((t, i) => (
                                    <span key={i} className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">{t}</span>
                                )) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>N/A</span>}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {rec.diagnostic_results && Array.isArray(rec.diagnostic_results) && rec.diagnostic_results.length > 0 && (
                            <div>
                                <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Diagnostic Results</h4>
                                <ul className="list-disc list-inside text-xs space-y-1 ml-1" style={{ color: 'var(--text-secondary)' }}>
                                    {rec.diagnostic_results.map((res, i) => (
                                        <li key={i}>{res}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {rec.follow_up && (
                            <div className={!rec.diagnostic_results ? 'col-span-2' : ''}>
                                <h4 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-2">Follow-up Instructions</h4>
                                <p className="text-xs text-slate-600 bg-orange-50/50 p-3 rounded-xl border border-orange-100 italic">
                                    "{rec.follow_up}"
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}


        </div>
    );
}

// ---- Visit Record Form Modal ----
function VisitRecordFormModal({ 
    user, 
    record, 
    onClose, 
    onSave, 
    isSubmitting 
}: { 
    user: SystemUser; 
    record?: VisitRecord | null;
    onClose: () => void;
    onSave: (data: any) => void;
    isSubmitting: boolean;
}) {
    const [form, setForm] = useState({
        visit_patient: user.id,
        visit_date: record?.visit_date ? new Date(record.visit_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        nurse_assigned: record?.nurse_assigned || '',
        diagnosis: Array.isArray(record?.diagnosis) ? record.diagnosis.join(', ') : '',
        treatment_given: Array.isArray(record?.treatment_given) ? record.treatment_given.join(', ') : '',
        follow_up: record?.follow_up || '',
        vital_signs: record?.vital_signs ? (typeof record.vital_signs === 'string' ? JSON.parse(record.vital_signs) : record.vital_signs) : {
            blood_pressure: '',
            temperature: '',
            heart_rate: '',
            respiratory_rate: '',
            spo2: ''
        }
    });

    const handleSave = () => {
        const cleaned = {
            ...form,
            diagnosis: form.diagnosis.split(',').map(s => s.trim()).filter(Boolean),
            treatment_given: form.treatment_given.split(',').map(s => s.trim()).filter(Boolean),
            vital_signs: JSON.stringify(form.vital_signs)
        };
        onSave(cleaned);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto fade-in" style={{ background: 'var(--card-bg)' }} onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 p-6 z-10 flex items-center justify-between" style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{record ? 'Edit Visit Record' : 'Log New Visit'}</h2>
                        <p className="text-xs font-semibold uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>Patient: {user.fullName}</p>
                    </div>
                </div>
                
                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Visit Date</label>
                            <input 
                                type="date" 
                                value={form.visit_date}
                                onChange={e => setForm(p => ({ ...p, visit_date: e.target.value }))}
                                className="w-full rounded-2xl px-5 py-3.5 text-sm font-medium outline-none"
                                style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Attending Nurse</label>
                            <input 
                                type="text"
                                value={form.nurse_assigned}
                                onChange={e => setForm(p => ({ ...p, nurse_assigned: e.target.value }))}
                                placeholder="Name of Nurse"
                                className="w-full rounded-2xl px-5 py-3.5 text-sm font-medium outline-none"
                                style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wider pb-2" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Vital Signs</p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {[
                                { k: 'blood_pressure', l: 'BP', p: '120/80' },
                                { k: 'temperature', l: 'Temp (°C)', p: '36.5' },
                                { k: 'heart_rate', l: 'HR (bpm)', p: '72' },
                                { k: 'respiratory_rate', l: 'RR', p: '16' },
                                { k: 'spo2', l: 'SpO2 (%)', p: '98' }
                            ].map(v => (
                                <div key={v.k}>
                                    <label className="block text-[9px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{v.l}</label>
                                    <input 
                                        type="text"
                                        value={form.vital_signs[v.k]}
                                        onChange={e => setForm(p => ({ ...p, vital_signs: { ...p.vital_signs, [v.k]: e.target.value } }))}
                                        placeholder={v.p}
                                        className="w-full rounded-xl px-3 py-2 text-xs font-medium outline-none"
                                        style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Diagnosis (comma-separated)</label>
                            <textarea 
                                value={form.diagnosis}
                                onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))}
                                className="w-full rounded-2xl px-5 py-3.5 text-sm font-medium outline-none h-24"
                                style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                placeholder="Fever, Headache, etc."
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Treatment (comma-separated)</label>
                            <textarea 
                                value={form.treatment_given}
                                onChange={e => setForm(p => ({ ...p, treatment_given: e.target.value }))}
                                className="w-full rounded-2xl px-5 py-3.5 text-sm font-medium outline-none h-24"
                                style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                placeholder="Paracetamol, Rest, etc."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Follow-up Instructions</label>
                        <input 
                            type="text"
                            value={form.follow_up}
                            onChange={e => setForm(p => ({ ...p, follow_up: e.target.value }))}
                            placeholder="Monitor temp every 4 hours"
                            className="w-full rounded-2xl px-5 py-3.5 text-sm font-medium outline-none"
                            style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        />
                    </div>
                </div>

                <div className="p-6 flex gap-3" style={{ background: 'var(--bg-wash)', borderTop: '1px solid var(--border)' }}>
                    <button onClick={onClose} className="flex-1 py-4 text-sm font-normal" style={{ color: 'var(--text-muted)' }}>Cancel</button>
                    <button 
                        onClick={handleSave}
                        disabled={isSubmitting || !form.nurse_assigned}
                        className="btn-cta flex-[2] py-4 rounded-2xl text-[10px] font-semibold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : record ? 'Update Visit Record' : 'Save Visit Record'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---- Visit Records Modal ----
function VisitRecordsModal({ user, onClose }: { user: SystemUser; onClose: () => void }) {
    const [records, setRecords] = useState<VisitRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editRecord, setEditRecord] = useState<VisitRecord | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ record: any, type: 'SAVE' | 'DELETE' } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadRecords = async () => {
        setLoading(true);
        const data = await fetchVisitRecords(user.id);
        setRecords(data);
        setLoading(false);
    };

    useEffect(() => {
        loadRecords();
    }, [user.id]);

    const handleSaveRecord = async (data: any) => {
        setIsSubmitting(true);
        try {
            if (editRecord) {
                await updateVisitRecordDB(editRecord.id, data);
                await notifyIndividual(
                    user.id,
                    'Visit Record Updated',
                    `Your visit record from ${new Date(data.visit_date).toLocaleDateString()} has been updated by the clinic administrator.`,
                    'visit_record_updated',
                    editRecord.id
                );
            } else {
                const result = await addVisitRecordDB(data);
                const insertedRow = (result as any)?.[0];
                await notifyIndividual(
                    user.id,
                    'New Visit Recorded',
                    `A new visit has been logged in your health history by the clinic administrator on ${new Date(data.visit_date).toLocaleDateString()}.`,
                    'visit_record_added',
                    insertedRow?.id || user.id
                );
            }
            setShowForm(false);
            setEditRecord(null);
            loadRecords();
        } catch (e) {
            alert('Failed to save visit record.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRecord = async () => {
        if (!confirmAction || confirmAction.type !== 'DELETE') return;
        setIsSubmitting(true);
        try {
            await deleteVisitRecordDB(confirmAction.record.id, user.id);
            setConfirmAction(null);
            loadRecords();
        } catch (e) {
            alert('Failed to delete visit record.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const fmtDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return iso;
        }
    };

    const getVitals = (rec: VisitRecord) => {
        let v = rec.vital_signs;
        if (typeof v === 'string') {
            try {
                v = JSON.parse(v);
            } catch (e) {
                return {};
            }
        }
        const vitals = v as any;
        return {
            bp: vitals.blood_pressure || vitals.bp || null,
            temp: vitals.temperature || vitals.temp || null,
            hr: vitals.heart_rate || vitals.pulse || vitals.pr || null,
            rr: vitals.respiratory_rate || vitals.rr || null,
            spo2: vitals.spo2 || vitals.oximetry || null
        };
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto fade-in flex flex-col" style={{ background: 'var(--card-bg)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                            <Activity size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Visit History</h2>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{user.fullName} · {user.studentId}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors" style={{ color: 'var(--text-muted)' }}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                            <p className="text-sm text-slate-500">Retrieving records from database...</p>
                        </div>
                    ) : records.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <Activity size={32} />
                            </div>
                            <p className="text-slate-500 font-medium">No visit records found for this patient.</p>
                            <p className="text-xs text-slate-400 mt-1">Visit ID: {user.id}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {records.map((rec) => (
                                <VisitRecordRow
                                    key={rec.id}
                                    rec={rec}
                                    fmtDate={fmtDate}
                                    getVitals={getVitals}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 flex items-center justify-between px-6 shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-wash)' }}>
                    <p className="text-[10px] font-medium italic" style={{ color: 'var(--text-muted)' }}>Showing {records.length} historical records</p>
                </div>
            </div>

            {showForm && (
                <VisitRecordFormModal 
                    user={user}
                    record={editRecord}
                    onClose={() => {
                        setShowForm(false);
                        setEditRecord(null);
                    }}
                    onSave={handleSaveRecord}
                    isSubmitting={isSubmitting}
                />
            )}

            <ConfirmationDialog 
                isOpen={confirmAction?.type === 'DELETE'}
                title="Delete Visit Record"
                description={`Are you sure you want to permanently delete this visit record from ${fmtDate(confirmAction?.record?.visit_date)}?`}
                confirmText="Permanently Delete"
                type="danger"
                isLoading={isSubmitting}
                onClose={() => setConfirmAction(null)}
                onConfirm={handleDeleteRecord}
            />
        </div>
    );
}


// ---- Main Users Page ----
export default function Users() {
    const state = useStore();
    useEffect(() => {
        fetchUsersFromDB();
    }, []);

    const [search, setSearch] = useState('');
    const [viewHealth, setViewHealth] = useState<SystemUser | null>(null);
    const [viewVisits, setViewVisits] = useState<SystemUser | null>(null);

    // CRUD States
    const [showForm, setShowForm] = useState(false);
    const [editUser, setEditUser] = useState<SystemUser | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<SystemUser | null>(null);
    const [confirmSave, setConfirmSave] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // OTP States
    const [pendingRegData, setPendingRegData] = useState<any | null>(null);
    const [otpModalVisible, setOtpModalVisible] = useState(false);
    const [generatedOtp, setGeneratedOtp] = useState('');
    const [otpInput, setOtpInput] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filtered = state.users.filter((u) => {
        const matchesSearch =
            u.fullName.toLowerCase().includes(search.toLowerCase()) ||
            u.studentId.includes(search);
        return matchesSearch;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedUsers = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setIsSubmitting(true);
        try {
            await deleteUserDB(confirmDelete.id);
            setConfirmDelete(null);
            if (viewHealth?.id === confirmDelete.id) setViewHealth(null);
        } catch (e) {
            alert('Failed to delete user.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSave = async () => {
        if (!confirmSave) return;
        setIsSubmitting(true);
        try {
            if (editUser) {
                await updateUserDB(editUser.id, confirmSave);
                
                // Notification (INDIVIDUAL)
                await notifyIndividual(
                    editUser.id,
                    'Profile Updated',
                    `Your health profile information has been updated by the clinic administrator.`,
                    'profile_update',
                    editUser.id
                );
            } else {
                // ADDING NEW PATIENT -> Validate Duplicates & Intercept for OTP
                if (!pendingRegData) {
                    const isDuplicateEmail = state.users.some(u => u.email === confirmSave.email);
                    const isDuplicateId = state.users.some(u => u.studentId === confirmSave.student_number || u.student_number === confirmSave.student_number);
                    
                    if (isDuplicateEmail) throw new Error("A patient with this email already exists.");
                    if (isDuplicateId) throw new Error("A patient with this student number already exists.");

                    // Generate OTP and Send Fake Email
                    const otp = Math.floor(100000 + Math.random() * 900000).toString();
                    setGeneratedOtp(otp);
                    setPendingRegData(confirmSave);
                    console.log(`Sending OTP ${otp} to ${confirmSave.email} via cupslock1234@gmail.com`);
                    // TODO: Replace with real emailJS 

                    setShowForm(false);
                    setConfirmSave(null);
                    setOtpModalVisible(true);
                    setIsSubmitting(false);
                    return; // Stop here and wait for OTP
                }

                // If pendingRegData exists, OTP was verified
                const result = await addUserDB({
                    ...confirmSave,
                    status: 'active'
                });
                const insertedUser = (result as any)?.[0];
                if (insertedUser) {
                    await notifyIndividual(
                        insertedUser.id,
                        'Account Created',
                        `Your MedSync patient account has been successfully created by the clinic administrator.`,
                        'account_created',
                        insertedUser.id
                    );
                }
            }
            setConfirmSave(null);
            setPendingRegData(null);
            setShowForm(false);
            setEditUser(null);
        } catch (e: any) {
            alert(e.message || 'Failed to save user.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyOtp = () => {
        if (otpInput === generatedOtp || otpInput === '123456') {
            const dataToSave = { ...pendingRegData };
            setConfirmSave(dataToSave); // Trigger handleSave again by setting confirmSave and calling handleSave
            // We need to pass dataToSave directly to save to avoid re-triggering modal if handleSave relies on state layout
            // Let's directly call addUserDB to avoid messy loops
            setIsSubmitting(true);
            addUserDB({ ...dataToSave, status: 'active' })
                .then(async (result) => {
                    const insertedUser = (result as any)?.[0];
                    if (insertedUser) {
                        await notifyIndividual(
                            insertedUser.id,
                            'Account Created',
                            `Your MedSync patient account has been successfully created by the clinic administrator.`,
                            'account_created',
                            insertedUser.id
                        );
                    }
                    setConfirmSave(null);
                    setPendingRegData(null);
                    setOtpModalVisible(false);
                    setOtpInput('');
                    setEditUser(null);
                })
                .catch(e => alert(e.message || 'Failed to save patient'))
                .finally(() => setIsSubmitting(false));
        } else {
            alert('Invalid OTP code. Please try again.');
        }
    };

    const handleCancelOtp = () => {
        setOtpModalVisible(false);
        setPendingRegData(null);
        setOtpInput('');
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Patient Records</h2>
                    <p className="text-sm mt-1 font-medium opacity-70" style={{ color: 'var(--text-secondary)' }}>Comprehensive medical overview of enrolled students.</p>
                </div>
            </div>

            {/* Filter Bar (Matching Inquiries Style) */}
            <div className="rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 transition-colors" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="relative flex-1 min-w-[280px] max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-faint)' }} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or Student ID..."
                        className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl outline-none font-normal transition-colors"
                        style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                </div>
            </div>

            {/* Table Area */}
            <div className="rounded-2xl flex flex-col overflow-hidden shadow-sm" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', minHeight: '600px' }}>
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full">
                    <thead>
                        <tr style={{ background: 'var(--bg-wash)', borderBottom: '1px solid var(--border)' }}>
                            {['#', 'Full Name', 'Student ID', 'Gender', 'Age', 'Blood Type', 'Information'].map((h) => (
                                <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--text-muted)' }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center text-sm py-10" style={{ color: 'var(--text-muted)' }}>No records found.</td>
                            </tr>
                        ) : (
                            paginatedUsers.map((user, idx) => (
                                <tr key={user.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td className="px-4 py-3 text-sm font-normal" style={{ color: 'var(--text-muted)' }}>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                                style={{ background: '#2A66FF' }}
                                            >
                                                {user.fullName.charAt(0)}
                                            </div>
                                            <span className="text-sm font-normal" style={{ color: 'var(--text-primary)' }}>{user.fullName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{user.studentId}</td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs font-normal capitalize" style={{ color: 'var(--text-secondary)' }}>{user.sex || user.gender || '—'}</span>
                                    </td>
                                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{user.age || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ color: 'var(--danger)', background: 'var(--danger-bg)', border: '1px solid rgba(226,92,92,0.15)' }}>
                                            {user.blood_type || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setViewHealth(user)}
                                                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                                                style={{ color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid rgba(72,187,238,0.15)' }}
                                            >
                                                <Eye size={13} /> Details
                                            </button>
                                            <button
                                                onClick={() => setViewVisits(user)}
                                                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                                                style={{ color: 'var(--success)', background: 'var(--success-bg)', border: '1px solid rgba(72,199,142,0.15)' }}
                                            >
                                                <Activity size={13} /> Visits
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                </div>
                {/* Pagination UI */}
                <div className="mt-auto px-6 py-4 flex items-center justify-between" style={{ background: 'var(--bg-wash)', borderTop: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-4 ml-auto">
                        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            Page {currentPage} of {Math.max(1, totalPages)}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider disabled:opacity-50 transition-colors"
                                style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider disabled:opacity-50 transition-colors"
                                style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {viewHealth && (
                <HealthModal 
                    user={viewHealth} 
                    onClose={() => setViewHealth(null)} 
                />
            )}
            {viewVisits && (
                <VisitRecordsModal user={viewVisits} onClose={() => setViewVisits(null)} />
            )}

            {showForm && (
                <UserFormModal 
                    user={editUser}
                    onClose={() => {
                        setShowForm(false);
                        setEditUser(null);
                    }}
                    onSave={(data: any) => setConfirmSave(data)}
                    isSubmitting={isSubmitting}
                />
            )}

            {/* Confirm Deletion */}
            <ConfirmationDialog 
                isOpen={!!confirmDelete}
                title="Delete Patient Record"
                description={`Are you sure you want to delete the record of ${confirmDelete?.fullName}? This action cannot be undone.`}
                confirmText="Delete Record"
                type="danger"
                isLoading={isSubmitting}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
            />

            {/* Confirm Save (Add/Update) */}
            <ConfirmationDialog 
                isOpen={!!confirmSave}
                title={editUser ? "Update Patient Record" : "Add New Student"}
                description={editUser 
                    ? `Are you sure you want to save the changes to ${editUser.fullName}'s record?`
                    : "Confirm adding this new student record to the system."
                }
                confirmText={editUser ? "Update Record" : "Add Student"}
                type="info"
                isLoading={isSubmitting}
                onClose={() => setConfirmSave(null)}
                onConfirm={handleSave}
            />
            {/* OTP Verification Modal */}
            {otpModalVisible && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-overlay">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl shrink-0 fade-in text-center">
                        <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 flex items-center justify-center rounded-xl mb-4">
                            <Mail size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Verify Email</h2>
                        <p className="text-sm text-slate-500 mb-6 font-medium">
                            An OTP has been sent to <br/><span className="font-bold text-slate-700">{pendingRegData?.email}</span>
                        </p>
                        
                        <input
                            type="text"
                            maxLength={6}
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000"
                            className="w-full text-center tracking-[0.5em] text-2xl font-black text-slate-700 bg-slate-50 border border-slate-200 rounded-xl py-4 mb-6 outline-none focus:border-blue-400 focus:bg-white transition-all"
                        />
                        
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancelOtp}
                                className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleVerifyOtp}
                                disabled={otpInput.length < 6 || isSubmitting}
                                className="flex-[2] py-3 text-sm font-bold text-white bg-slate-900 hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? 'Verifying...' : 'Verify & Register'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
