import { useState, useEffect } from 'react';
import { Plus, MapPin, X, Building2, LayoutGrid, List, Filter, ChevronDown, Edit, Trash2, UserPlus } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { addLog, fetchCampusesFromDB, fetchClinicsFromDB, addCampusDB, addClinicDB, deleteCampusDB, updateCampusDB, deleteClinicDB, updateClinicDB } from '../store';
import { notifyAllUsers } from '../lib/notifications';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import type { CampusRecord, Clinic } from '../types';

const BARANGAYS = [
    "Arkong Bato", "Bagbaguin", "Balangkas", "Bignay", "Bisig",
    "Canumay East", "Canumay West", "Coloong", "Dalandanan",
    "Gen. T. de Leon", "Isla", "Karuhatan", "Lawang Bato",
    "Lingunan", "Mabolo", "Malanday", "Malinta", "Mapulang Lupa",
    "Marulas", "Maysan", "Palasan", "Pariancillo Villa", "Pasolo",
    "Paso de Blas", "Poblacion", "Pulo", "Punturin", "Rincon",
    "Tagalag", "Ugong", "Viente Reales", "Wawang Pulo"
];

// ---- Campus Form Modal (Add & Edit) ----
function CampusFormModal({ campus, onClose, onSave, isSubmitting }: { 
    campus?: CampusRecord | null; 
    onClose: () => void;
    onSave: (data: any) => void;
    isSubmitting: boolean;
}) {
    const [form, setForm] = useState({ 
        name: campus?.name || '', 
        location: campus?.location || '', 
        contact: campus?.contact || '',
        active: campus ? campus.active : true
    });

    const isNumeric = (str: string) => /^\d+$/.test(str);
    const valid = form.name.trim() && form.location && form.contact.trim() && isNumeric(form.contact.trim());

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-2xl shadow-2xl w-full max-w-lg fade-in" style={{ background: 'var(--card-bg)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{campus ? 'Edit Campus' : 'Add New Campus'}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ color: 'var(--text-muted)' }}
                        onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-wash)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-[15px] font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Campus Name</label>
                        <input
                            value={form.name}
                            onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="e.g. PLV Main Campus"
                            className="w-full rounded-xl px-4 py-2.5 text-[15px] outline-none"
                            style={{ border: '1px solid var(--border)', background: 'var(--bg-wash)', color: 'var(--text-primary)' }}
                        />
                    </div>
                    <div>
                        <label className="block text-[15px] font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Barangay Location</label>
                        <div className="relative">
                            <select
                                value={form.location}
                                onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))}
                                className="w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-[15px] outline-none font-normal"
                                style={{ border: '1px solid var(--border)', background: 'var(--bg-wash)', color: 'var(--text-primary)' }}
                            >
                                <option value="">— Select Barangay —</option>
                                {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[15px] font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Contact Number (Numeric only)</label>
                        <input
                            value={form.contact}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d+$/.test(val)) {
                                    setForm(p => ({ ...p, contact: val }));
                                }
                            }}
                            placeholder="e.g. 09123456789"
                            className="w-full rounded-xl px-4 py-2.5 text-[15px] outline-none"
                            style={{ border: '1px solid var(--border)', background: 'var(--bg-wash)', color: 'var(--text-primary)' }}
                        />
                    </div>
                    {campus && (
                        <div className="flex items-center gap-2 pt-2">
                            <input 
                                type="checkbox" 
                                id="campus-active"
                                checked={form.active}
                                onChange={(e) => setForm(p => ({ ...p, active: e.target.checked }))}
                                className="w-4 h-4 rounded"
                                style={{ accentColor: 'var(--accent)' }}
                            />
                            <label htmlFor="campus-active" className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>Operational Status (Active)</label>
                        </div>
                    )}
                </div>
                <div className="flex gap-3 px-5 pb-5">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[15px] font-normal transition-colors"
                        style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                        onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-wash)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(form)}
                        disabled={!valid || isSubmitting}
                        className="btn-cta flex-1 py-2.5 rounded-xl text-[15px] font-medium text-white disabled:opacity-40 transition-all active:scale-95"
                    >
                        {isSubmitting ? 'Saving...' : campus ? 'Update Campus' : 'Add Campus'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---- Clinic Form Modal (Add & Edit) ----
function ClinicFormModal({ clinic, campuses, onClose, onSave, isSubmitting }: { 
    clinic?: Clinic | null; 
    campuses: CampusRecord[]; 
    onClose: () => void;
    onSave: (data: any) => void;
    isSubmitting: boolean;
}) {
    const [form, setForm] = useState({ 
        name: clinic?.name || '', 
        campusId: clinic?.campusId || campuses[0]?.id || '', 
        contact: clinic?.contact || '' 
    });

    const isNumeric = (str: string) => /^\d+$/.test(str);
    const valid = form.name.trim() && form.campusId && form.contact.trim() && isNumeric(form.contact.trim());

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-2xl shadow-2xl w-full max-w-lg fade-in" style={{ background: 'var(--card-bg)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{clinic ? 'Edit Clinic' : 'Add New Clinic'}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ color: 'var(--text-muted)' }}
                        onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-wash)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-[15px] font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Clinic Name</label>
                        <input
                            value={form.name}
                            onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="e.g. Main Health Clinic"
                            className="w-full rounded-xl px-4 py-2.5 text-[15px] outline-none"
                            style={{ border: '1px solid var(--border)', background: 'var(--bg-wash)', color: 'var(--text-primary)' }}
                        />
                    </div>
                    <div>
                        <label className="block text-[15px] font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Campus Assignment</label>
                        <div className="relative">
                            <select
                                value={form.campusId}
                                onChange={(e) => setForm(p => ({ ...p, campusId: e.target.value }))}
                                className="w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-[15px] outline-none font-normal"
                                style={{ border: '1px solid var(--border)', background: 'var(--bg-wash)', color: 'var(--text-primary)' }}
                            >
                                <option value="">— Select Campus —</option>
                                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[15px] font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Contact Number (Numeric only)</label>
                        <input
                            value={form.contact}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d+$/.test(val)) {
                                    setForm(p => ({ ...p, contact: val }));
                                }
                            }}
                            placeholder="e.g. 85270000"
                            className="w-full rounded-xl px-4 py-2.5 text-[15px] outline-none"
                            style={{ border: '1px solid var(--border)', background: 'var(--bg-wash)', color: 'var(--text-primary)' }}
                        />
                    </div>
                </div>
                <div className="flex gap-3 px-5 pb-5">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[15px] font-normal transition-colors"
                        style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                        onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-wash)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(form)}
                        disabled={!valid || isSubmitting}
                        className="btn-cta flex-1 py-2.5 rounded-xl text-[15px] font-medium text-white disabled:opacity-40 transition-all active:scale-95"
                    >
                        {isSubmitting ? 'Saving...' : clinic ? 'Update Clinic' : 'Create Clinic'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CampusCard({ 
    campus, 
    clinics, 
    index, 
    onAddClinic,
    onEdit,
    onDelete
}: { 
    campus: CampusRecord; 
    clinics: Clinic[]; 
    index: number; 
    onAddClinic: (id: string) => void;
    onEdit: (c: CampusRecord) => void;
    onDelete: (c: CampusRecord) => void;
}) {
    const labels = ['MAIN', 'ANNEX', 'CPAG'];

    return (
        <div className="rounded-2xl p-5 fade-in flex flex-col group relative overflow-hidden transition-all duration-300"
            style={{ 
                background: 'var(--card-bg)', 
                border: '1px solid var(--border)', 
                boxShadow: 'var(--shadow-sm)' 
            }}>
            <div
                className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl opacity-40"
                style={{ background: 'var(--accent)' }}
            />
            <div className="flex items-start justify-between mb-4">
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-[13px] font-bold shadow-sm"
                    style={{ background: 'var(--accent)' }}
                >
                    {labels[index] || campus.name.substring(0, 3).toUpperCase()}
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => onEdit(campus)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                        style={{ color: 'var(--accent)' }}
                        onMouseOver={e => { e.currentTarget.style.background = 'var(--accent-light)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        <Edit size={14} />
                    </button>
                    <button 
                        onClick={() => onDelete(campus)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                        style={{ color: 'var(--danger)' }}
                        onMouseOver={e => { e.currentTarget.style.background = 'var(--danger-bg)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        <Trash2 size={14} />
                    </button>
                    <span className="text-[12px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border"
                        style={{
                            background: campus.active ? 'var(--success-bg)' : 'var(--bg-wash)',
                            color: campus.active ? 'var(--success)' : 'var(--text-muted)',
                            borderColor: campus.active ? 'rgba(72,199,142,0.15)' : 'var(--border)',
                        }}>
                        {campus.active ? 'Operational' : 'Inactive'}
                    </span>
                </div>
            </div>
            
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>{campus.name}</h3>
            <p className="text-[13px] mb-4 font-medium opacity-70 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {campus.description || 'General university medical facility serving students and faculty.'}
            </p>
            <div className="flex items-center gap-1.5 mb-5 px-3 py-2 rounded-xl" style={{ background: 'var(--bg-wash)', border: '1px solid var(--border-light)' }}>
                <MapPin size={13} style={{ color: 'var(--text-faint)' }} />
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{campus.location}</span>
            </div>

            <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h4 className="text-[12px] font-extrabold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Assigned Clinics</h4>
                    <span className="text-[12px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{clinics.length}</span>
                </div>
                <div className="space-y-2">
                    {clinics.length > 0 ? (
                        clinics.map(c => (
                            <div key={c.id} className="flex items-center justify-between p-3 rounded-xl transition-all hover:translate-x-1"
                                style={{ background: 'var(--bg-wash)', border: '1px solid var(--border-light)' }}>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                                </div>
                                <Building2 size={12} style={{ color: 'var(--text-faint)' }} />
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-6 rounded-xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
                             <Building2 size={24} className="opacity-10 mb-2" />
                             <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>No Clinics Assigned</p>
                        </div>
                    )}
                </div>
            </div>

            <button 
                onClick={() => onAddClinic(campus.id)}
                className="mt-6 w-full py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-widest transition-all active:scale-95 border"
                style={{ 
                    background: 'var(--card-bg)', 
                    color: 'var(--text-secondary)',
                    borderColor: 'var(--border)'
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-wash)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'var(--card-bg)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
                Add New Clinic
            </button>
        </div>
    );
}

// ---- Main Campuses Page ----
export default function Campuses() {
    const state = useStore();
    const [showCampusForm, setShowCampusForm] = useState(false);
    const [editCampus, setEditCampus] = useState<CampusRecord | null>(null);
    const [confirmDeleteCampus, setConfirmDeleteCampus] = useState<CampusRecord | null>(null);
    const [confirmSaveCampus, setConfirmSaveCampus] = useState<any | null>(null);

    const [showClinicForm, setShowClinicForm] = useState(false);
    const [editClinic, setEditClinic] = useState<Clinic | null>(null);
    const [confirmDeleteClinic, setConfirmDeleteClinic] = useState<Clinic | null>(null);
    const [confirmSaveClinic, setConfirmSaveClinic] = useState<any | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'directory'>('grid');
    const [campusFilter, setCampusFilter] = useState<'All' | string>('All');

    const [campusPage, setCampusPage] = useState(1);
    const campusesPerPage = 6;
    const [clinicPage, setClinicPage] = useState(1);
    const clinicsPerPage = 10;

    useEffect(() => {
        fetchCampusesFromDB();
        fetchClinicsFromDB();
    }, []);

    useEffect(() => {
        setCampusPage(1);
        setClinicPage(1);
    }, [campusFilter, viewMode]);

    const filteredCampuses = state.campuses.filter(c => campusFilter === 'All' || c.id === campusFilter);
    const campusTotalPages = Math.ceil(filteredCampuses.length / campusesPerPage);
    const paginatedCampuses = filteredCampuses.slice((campusPage - 1) * campusesPerPage, campusPage * campusesPerPage);

    const filteredClinics = (state.clinics || []).filter(c => {
        if (campusFilter === 'All') return true;
        return c.campusId === campusFilter;
    });
    const clinicTotalPages = Math.ceil(filteredClinics.length / clinicsPerPage);
    const paginatedClinics = filteredClinics.slice((clinicPage - 1) * clinicsPerPage, clinicPage * clinicsPerPage);

    const handleSaveCampus = async () => {
        if (!confirmSaveCampus) return;
        setIsSubmitting(true);
        try {
            if (editCampus) {
                await updateCampusDB(editCampus.id, confirmSaveCampus);
                addLog('Admin', `Updated campus: ${confirmSaveCampus.name}`);
            } else {
                await addCampusDB(confirmSaveCampus.name, confirmSaveCampus.location, confirmSaveCampus.contact);
                addLog('Admin', `Added new campus: ${confirmSaveCampus.name}`);
                await notifyAllUsers('New Campus Added', `A new campus, ${confirmSaveCampus.name}, has been added to our medical service network.`, 'campus_clinic_added');
            }
            setShowCampusForm(false);
            setEditCampus(null);
            setConfirmSaveCampus(null);
        } catch (e: any) {
            alert(e.message || 'Failed to save campus.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCampus = async () => {
        if (!confirmDeleteCampus) return;
        setIsSubmitting(true);
        try {
            await deleteCampusDB(confirmDeleteCampus.id);
            addLog('Admin', `Deleted campus: ${confirmDeleteCampus.name}`);
            setConfirmDeleteCampus(null);
        } catch (e: any) {
            alert(e.message || 'Failed to delete campus.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveClinic = async () => {
        if (!confirmSaveClinic) return;
        setIsSubmitting(true);
        try {
            if (editClinic) {
                await updateClinicDB(editClinic.id, confirmSaveClinic);
                addLog('Admin', `Updated clinic: ${confirmSaveClinic.name}`);
            } else {
                await addClinicDB(confirmSaveClinic.name, confirmSaveClinic.campusId, confirmSaveClinic.contact);
                addLog('Admin', `Added new clinic: ${confirmSaveClinic.name}`);
                const campusName = state.campuses.find(c => c.id === confirmSaveClinic.campusId)?.name || 'the university';
                await notifyAllUsers('New Clinic Created', `A new medical facility, ${confirmSaveClinic.name}, has been opened at ${campusName}.`, 'campus_clinic_added');
            }
            setShowClinicForm(false);
            setEditClinic(null);
            setConfirmSaveClinic(null);
        } catch (e: any) {
            alert(e.message || 'Failed to save clinic.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClinic = async () => {
        if (!confirmDeleteClinic) return;
        setIsSubmitting(true);
        try {
            await deleteClinicDB(confirmDeleteClinic.id);
            addLog('Admin', `Deleted clinic: ${confirmDeleteClinic.name}`);
            setConfirmDeleteClinic(null);
        } catch (e: any) {
            alert(e.message || 'Failed to delete clinic.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Campus & Clinics</h2>
                    <p className="text-[15px] mt-1 font-medium opacity-70" style={{ color: 'var(--text-secondary)' }}>Manage physical locations and medical facilities.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { setEditCampus(null); setShowCampusForm(true); }}
                        className="btn-cta flex items-center gap-2 text-[13px] font-medium text-white px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95"
                    >
                        <Plus size={14} /> New Campus
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                    { label: 'Total Campuses', val: state.campuses.length, color: 'var(--accent)', icon: MapPin },
                    { label: 'Total Clinics', val: (state.clinics || []).length, color: 'var(--teal-primary)', icon: Building2 },
                    { label: 'Active Personnel', val: state.officers.length, color: 'var(--success)', icon: UserPlus },
                ].map((stat, i) => (
                    <div key={i} className="kpi-card fade-in overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', position: 'relative', padding: '1.25rem', borderRadius: '1rem' }}>
                        <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: stat.color, opacity: 0.7 }} />
                        <div className="flex items-start justify-between relative z-10">
                            <div>
                                <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>{stat.label}</p>
                                <p className="text-3xl font-bold tracking-tight mt-1.5" style={{ color: 'var(--text-primary)' }}>{stat.val}</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${stat.color}14` }}>
                                <stat.icon size={20} style={{ color: stat.color }} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full" style={{ background: stat.color, opacity: 0.03 }} />
                    </div>
                ))}
            </div>

            {/* View Controls */}
            <div className="rounded-2xl p-3 flex flex-wrap items-center justify-between gap-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center gap-2 p-1.5 rounded-xl" style={{ background: 'var(--bg-wash)' }}>
                    <button 
                        onClick={() => setViewMode('grid')}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all"
                        style={{
                            background: viewMode === 'grid' ? 'var(--card-bg)' : 'transparent',
                            color: viewMode === 'grid' ? 'var(--accent)' : 'var(--text-muted)',
                            boxShadow: viewMode === 'grid' ? 'var(--shadow-xs)' : 'none',
                        }}
                    >
                        <LayoutGrid size={14} /> Campus View
                    </button>
                    <button 
                        onClick={() => setViewMode('directory')}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all"
                        style={{
                            background: viewMode === 'directory' ? 'var(--card-bg)' : 'transparent',
                            color: viewMode === 'directory' ? 'var(--accent)' : 'var(--text-muted)',
                            boxShadow: viewMode === 'directory' ? 'var(--shadow-xs)' : 'none',
                        }}
                    >
                        <List size={14} /> Clinic Directory
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                        <div className="relative">
                            <select
                                value={campusFilter}
                                onChange={(e) => setCampusFilter(e.target.value)}
                                className="appearance-none rounded-xl px-4 py-2 pr-10 text-[13px] font-medium outline-none transition-colors"
                                style={{ border: '1px solid var(--border)', background: 'var(--bg-wash)', color: 'var(--text-primary)' }}
                            >
                                <option value="All">All Campuses</option>
                                {state.campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                        </div>
                    </div>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedCampuses.map((campus, i) => (
                        <CampusCard 
                            key={campus.id} 
                            campus={campus} 
                            clinics={(state.clinics || []).filter(cl => cl.campusId === campus.id)} 
                            index={i} 
                            onAddClinic={(id) => {
                                setEditClinic(null);
                                setEditCampus(state.campuses.find(c => c.id === id) || null);
                                setShowClinicForm(true);
                            }}
                            onEdit={(c) => { setEditCampus(c); setShowCampusForm(true); }}
                            onDelete={(c) => setConfirmDeleteCampus(c)}
                        />
                    ))}
                    {/* Campus Pagination */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-4 flex items-center justify-between p-4 rounded-2xl"
                        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-4 ml-auto">
                            <span className="text-[12px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                Page {campusPage} of {Math.max(1, campusTotalPages)}
                            </span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setCampusPage(p => Math.max(1, p - 1))} disabled={campusPage === 1}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors"
                                    style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                    Previous
                                </button>
                                <button onClick={() => setCampusPage(p => Math.min(campusTotalPages, p + 1))} disabled={campusPage === campusTotalPages || campusTotalPages === 0}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors"
                                    style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl overflow-hidden fade-in" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <table className="w-full zebra-table">
                        <thead>
                            <tr style={{ background: 'var(--bg-wash)', borderBottom: '1px solid var(--border)' }}>
                                {['Clinic Name', 'Campus', 'Location', 'Contact', 'Actions'].map((h) => (
                                    <th key={h} className="text-left text-[10px] font-black uppercase tracking-widest px-6 py-4" style={{ color: 'var(--text-muted)' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedClinics.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-[15px] italic" style={{ color: 'var(--text-muted)' }}>No clinics found matching current filters.</td>
                                </tr>
                            ) : (
                                paginatedClinics.map((cl) => {
                                    const campus = state.campuses.find(c => c.id === cl.campusId);
                                    return (
                                        <tr key={cl.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                                                        <Building2 size={16} />
                                                    </div>
                                                    <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>{cl.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>{campus?.name || 'N/A'}</span>
                                            </td>
                                            <td className="px-6 py-4 text-[13px] font-normal" style={{ color: 'var(--text-secondary)' }}>
                                                {campus?.location || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                                                {cl.contact ? String(cl.contact).padStart(11, '0') : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => { setEditClinic(cl); setShowClinicForm(true); }}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                                        style={{ color: 'var(--accent)', background: 'var(--accent-light)' }}
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => setConfirmDeleteClinic(cl)}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                                        style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                    {/* Clinic Pagination */}
                    <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'var(--bg-wash)', borderTop: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-4 ml-auto">
                            <span className="text-[12px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                Page {clinicPage} of {Math.max(1, clinicTotalPages)}
                            </span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setClinicPage(p => Math.max(1, p - 1))} disabled={clinicPage === 1}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors"
                                    style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                    Previous
                                </button>
                                <button onClick={() => setClinicPage(p => Math.min(clinicTotalPages, p + 1))} disabled={clinicPage === clinicTotalPages || clinicTotalPages === 0}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors"
                                    style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCampusForm && (
                <CampusFormModal campus={editCampus} onClose={() => { setShowCampusForm(false); setEditCampus(null); }}
                    onSave={(data) => setConfirmSaveCampus(data)} isSubmitting={isSubmitting} />
            )}

            {showClinicForm && (
                <ClinicFormModal clinic={editClinic} campuses={editCampus ? [editCampus] : state.campuses}
                    onClose={() => { setShowClinicForm(false); setEditClinic(null); setEditCampus(null); }}
                    onSave={(data) => setConfirmSaveClinic(data)} isSubmitting={isSubmitting} />
            )}

            <ConfirmationDialog isOpen={!!confirmDeleteCampus} title="Delete Campus"
                description={`Are you sure you want to delete ${confirmDeleteCampus?.name}? All associated clinics may be affected.`}
                confirmText="Delete Campus" type="danger" isLoading={isSubmitting}
                onClose={() => setConfirmDeleteCampus(null)} onConfirm={handleDeleteCampus} />

            <ConfirmationDialog isOpen={!!confirmSaveCampus} title={editCampus ? "Update Campus" : "Add Campus"}
                description={`Confirm ${editCampus ? 'saving changes to' : 'adding'} ${confirmSaveCampus?.name || 'this campus'}?`}
                confirmText={editCampus ? "Update" : "Add"} type="info" isLoading={isSubmitting}
                onClose={() => setConfirmSaveCampus(null)} onConfirm={handleSaveCampus} />

            <ConfirmationDialog isOpen={!!confirmDeleteClinic} title="Delete Clinic"
                description={`Are you sure you want to delete ${confirmDeleteClinic?.name}?`}
                confirmText="Delete Clinic" type="danger" isLoading={isSubmitting}
                onClose={() => setConfirmDeleteClinic(null)} onConfirm={handleDeleteClinic} />

            <ConfirmationDialog isOpen={!!confirmSaveClinic} title={editClinic ? "Update Clinic" : "Add Clinic"}
                description={`Confirm ${editClinic ? 'saving changes to' : 'adding'} ${confirmSaveClinic?.name || 'this clinic'}?`}
                confirmText={editClinic ? "Update" : "Add"} type="info" isLoading={isSubmitting}
                onClose={() => setConfirmSaveClinic(null)} onConfirm={handleSaveClinic} />
        </div>
    );
}

