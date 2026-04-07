import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
    FileText, Search, ChevronDown, Plus, Upload,
    Eye, Calendar, User, Check, Phone, Package, ClipboardList, Edit, X, Pill,
    ArrowUp, ArrowDown, Edit2, Trash2, Clock, MessageSquare, ExternalLink, ShieldCheck
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import jsPDF from 'jspdf';
import {
    addLog,
    fetchMedicalCertRequestsFromDB,
    updateMedicalCertStatusDB,
    deleteMedicalCertRequestDB,
    addMedicalCertRequestDB,
    updateMedicalCertRequestDB,
    fetchMedicineRequestsFromDB,
    updateMedicineRequestStatusDB,
    deleteMedicineRequestDB,
    addMedicineRequestDB,
    updateMedicineRequestDB
} from '../store';
import { notifyIndividual, type NotificationType } from '../lib/notifications';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import type { MedicalCertRequest, MedicineRequest, SystemUser } from '../types';



// ---- New Med Request Modal ----
export function NewMedRequestModal({
    onClose,
    onSave,
    isSubmitting,
    initialData
}: {
    onClose: () => void;
    onSave: (data: Partial<MedicineRequest>) => Promise<void>;
    isSubmitting: boolean;
    initialData?: MedicineRequest;
}) {
    const { users, inventory } = useStore();
    const [step, setStep] = useState(initialData ? 2 : 1);
    const [selectedUser, setSelectedUser] = useState<SystemUser | null>(
        initialData ? (initialData.profiles as SystemUser) : null
    );
    const [search, setSearch] = useState('');

    // Form data
    const [formData, setFormData] = useState({
        requested_tst: initialData?.requested_tst ? new Date(initialData.requested_tst).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        request_reason: initialData?.request_reason || '',
        contact_number: initialData?.contact_number || '',
        medicine: initialData?.medicine || '',
        medicine_qty: initialData?.medicine_qty || 1,
        campus: initialData?.campus || ''
    });

    const filteredUsers = users.filter(u =>
        u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        u.studentId?.includes(search) ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 5);

    const availableMeds = inventory.filter(item => item.status === 'Available' && item.quantity > 0);

    const isValidStep2 = formData.request_reason && formData.contact_number && formData.medicine && formData.medicine_qty > 0 && formData.campus;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-2xl shadow-2xl w-full max-w-lg fade-in overflow-hidden flex flex-col max-h-[90vh]"
                style={{ background: 'var(--card-bg)' }}
                onClick={(e) => e.stopPropagation()}>

                {/* Modal Header */}
                <div className="px-8 py-6 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-wash)' }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'var(--cta-gradient)', color: '#fff' }}>
                            {initialData ? <Edit2 size={24} /> : <Plus size={24} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight " style={{ color: 'var(--text-primary)' }}>
                                {initialData ? 'Edit Medicine Request' : 'New Medicine Request'}
                            </h2>
                            <p className="text-[10px] font-extrabold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                {initialData ? 'Manage manually created details' : `Step ${step} of 2 • ${step === 1 ? 'Search Student' : 'Medical Details'}`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-slate-200/50 hover:scale-110" style={{ color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                    {step === 1 ? (
                        <div className="space-y-4">
                            <div className="relative group">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search student name or ID number..."
                                    className="w-full pl-11 pr-4 py-3.5 text-sm rounded-xl outline-none transition-all"
                                    style={{ background: 'var(--bg-wash)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-3 ml-1">
                                    <div className="w-1 h-3 rounded-full bg-emerald-500" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Search Results</p>
                                </div>
                                {filteredUsers.length === 0 ? (
                                    <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl bg-slate-50/50" style={{ borderColor: 'var(--border-light)' }}>
                                        <User size={32} className="text-slate-200 mb-2" />
                                        <p className="text-xs font-medium italic text-slate-400">No matching records found</p>
                                    </div>
                                ) : (
                                    filteredUsers.map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => {
                                                setSelectedUser(u);
                                                setFormData(prev => ({ ...prev, contact_number: u.contact_number || '' }));
                                                setStep(2);
                                            }}
                                            className="w-full p-5 rounded-2xl border text-left transition-all hover:shadow-xl hover:border-emerald-400 active:scale-[0.98] group flex items-center justify-between"
                                            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)' }}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors border border-transparent group-hover:border-emerald-100 shadow-sm">
                                                    <User size={22} />
                                                </div>
                                                <div>
                                                    <p className="text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>{u.fullName || `${u.first_name} ${u.last_name}`}</p>
                                                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">ID: {u.studentId || u.student_number}</p>
                                                </div>
                                            </div>
                                            <ChevronDown size={20} className="-rotate-90 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 fade-in">
                            {/* Selected Header */}
                            <div className="p-4 rounded-xl border flex items-center gap-4 shadow-sm" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-emerald-50">
                                    <User size={22} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Assigned Requester</p>
                                    <h4 className="text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>{selectedUser?.fullName || `${selectedUser?.first_name} ${selectedUser?.last_name}`}</h4>
                                    <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>ID: {selectedUser?.studentId || selectedUser?.student_number}</p>
                                </div>
                                {!initialData && (
                                    <button
                                        onClick={() => setStep(1)}
                                        className="px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                                    >
                                        Change
                                    </button>
                                )}
                            </div>

                            {/* Section: Item Info */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-1 ml-1">
                                    <Package size={16} className="text-emerald-500" />
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Medicine & Stock Details</h3>
                                </div>

                                <div className="p-5 rounded-2xl space-y-4 border" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Item Requested From Inventory</label>
                                        <div className="relative">
                                            <select
                                                value={formData.medicine}
                                                onChange={(e) => {
                                                    const med = availableMeds.find(m => m.item_name === e.target.value);
                                                    setFormData(p => ({ ...p, medicine: e.target.value, campus: med?.campus || '', medicine_qty: 1 }));
                                                }}
                                                className="w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all appearance-none pr-10"
                                                style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
                                            >
                                                <option value="">Select medicine item...</option>
                                                {availableMeds.map(m => (
                                                    <option key={m.id} value={m.item_name}>{m.item_name} • {m.campus} ({m.quantity} left)</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Issue Quantity</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max={availableMeds.find(m => m.item_name === formData.medicine)?.quantity || 999}
                                                value={formData.medicine_qty}
                                                onChange={(e) => {
                                                    const val = Math.max(1, Number(e.target.value));
                                                    const max = availableMeds.find(m => m.item_name === formData.medicine)?.quantity || 999;
                                                    setFormData(p => ({ ...p, medicine_qty: Math.min(val, max) }));
                                                }}
                                                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold outline-none border"
                                                style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Origin Campus</label>
                                            <input
                                                value={formData.campus || 'Select Item First'}
                                                readOnly
                                                className="w-full rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-tight outline-none opacity-60 bg-slate-200/50"
                                                style={{ border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Context */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-1 ml-1">
                                    <ClipboardList size={16} className="text-emerald-500" />
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logistics & Remarks</h3>
                                </div>

                                <div className="p-5 rounded-2xl space-y-4 border" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Contact Information</label>
                                        <div className="relative">
                                            <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                value={formData.contact_number}
                                                onChange={(e) => setFormData(p => ({ ...p, contact_number: e.target.value }))}
                                                placeholder="09XXXXXXXXX"
                                                className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold outline-none border"
                                                style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Reason for Request</label>
                                        <textarea
                                            value={formData.request_reason}
                                            onChange={(e) => setFormData(p => ({ ...p, request_reason: e.target.value }))}
                                            placeholder="Provide a brief clinical or personal reason..."
                                            rows={2}
                                            className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none border resize-none leading-relaxed"
                                            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Backdated Entry (Optional)</label>
                                        <div className="relative">
                                            <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="datetime-local"
                                                value={formData.requested_tst}
                                                onChange={(e) => setFormData(p => ({ ...p, requested_tst: e.target.value }))}
                                                className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold outline-none border"
                                                style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t flex gap-3 shrink-0" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                    {step === 2 && !initialData && (
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                            style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
                        >
                            Back
                        </button>
                    )}
                    <button
                        disabled={(step === 2 && !isValidStep2) || isSubmitting}
                        onClick={async () => {
                            if (step === 1 || !selectedUser) return;
                            await onSave({
                                requester_id: selectedUser.id,
                                requested_tst: formData.requested_tst,
                                request_reason: formData.request_reason,
                                contact_number: formData.contact_number,
                                medicine: formData.medicine,
                                medicine_qty: formData.medicine_qty,
                                campus: formData.campus,
                                status: initialData?.status || 'PENDING'
                            });
                        }}
                        className="btn-cta flex-[2] py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
                    >
                        {isSubmitting ? 'Processing...' : step === 1 ? 'Search Student First' : initialData ? 'Update Request Record' : 'Create Medicine Request'}
                    </button>
                </div>
            </div>
        </div>
    );
}

interface CertDetails {
    location: string;
    nurse_assigned: string;
    diagnosis: string;
    excuse_start: string;
    excuse_end: string;
    custom_body: string;
}

// ---- PDF Generation ----
const generateMedicalCertPDF = (request: MedicalCertRequest, details: CertDetails) => {
    const doc = new jsPDF();
    const profile = request.profiles as SystemUser || {} as SystemUser;
    const fullName = [profile.first_name, profile.middle_name, profile.last_name, profile.suffix].filter(Boolean).join(' ');

    // Formal Header
    doc.setFontSize(22);
    doc.setFont('times', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('MEDICAL CERTIFICATE', 105, 40, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('times', 'normal');

    let y = 60;

    // Header Info
    doc.text(`Current Date: ${new Date().toLocaleDateString()}`, 20, y);
    y += 7;
    doc.text(`Location : ${details.location}, Valenzuela City`, 20, y);
    y += 20;

    // Body
    doc.setFont('times', 'bold');
    doc.text('To whom it may concern,', 20, y);
    y += 10;

    doc.setFont('times', 'normal');
    const bodyIntro = "This is to certify that the individual named below has undergone a medical assessment at our facility and was advised to rest due to health-related concerns:";
    const splitIntro = doc.splitTextToSize(bodyIntro, 170);
    doc.text(splitIntro, 20, y);
    y += (splitIntro.length * 6) + 5;

    // Bullet points
    doc.text(`•  Full Name : ${fullName}`, 30, y);
    y += 7;
    doc.text(`•  Date of Birth : ${profile.birthdate || 'N/A'}`, 30, y);
    y += 15;

    // Diagnosis and Excuse period
    const startStr = new Date(details.excuse_start).toLocaleDateString();
    const endStr = new Date(details.excuse_end).toLocaleDateString();

    let evalText = `Following clinical evaluation, the patient has been diagnosed with ${details.diagnosis}. It is medically necessary for the individual to be excused from work duties from ${startStr} to ${endStr} (inclusive) for recovery and to avoid further complications.`;

    // Use custom body if provided
    if (details.custom_body && details.custom_body.trim()) {
        evalText = details.custom_body;
    }

    const splitEval = doc.splitTextToSize(evalText, 170);
    doc.text(splitEval, 20, y);
    y += (splitEval.length * 6) + 10;

    const requestText = "This certificate has been issued upon the patient's request as proof of medical leave.";
    doc.text(requestText, 20, y);
    y += 10;

    doc.text("We appreciate your consideration.", 20, y);
    y += 30;

    // Signature
    doc.setFont('times', 'bold');
    doc.text(details.nurse_assigned, 140, y, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(110, y + 2, 170, y + 2);
    y += 7;
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text('Medical Health Professional', 140, y, { align: 'center' });
    y += 5;
    doc.text('PLV Health Services', 140, y, { align: 'center' });

    return doc.output('bloburl').toString();
};

// ---- Processing Modal ----
function CertProcessingModal({
    onClose,
    onGenerate,
    initialDetails
}: {
    onClose: () => void;
    onGenerate: (details: CertDetails) => void;
    initialDetails?: CertDetails | null;
}) {
    const { campuses } = useStore();
    const [step, setStep] = useState(1);

    // Random dates within current month for defaults
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const d1 = String(Math.floor(Math.random() * 10) + 1).padStart(2, '0');
    const d2 = String(Math.floor(Math.random() * 10) + 15).padStart(2, '0');

    const [details, setDetails] = useState<CertDetails>(initialDetails || {
        location: campuses[0]?.name || 'Maysan',
        nurse_assigned: '',
        diagnosis: 'gastrointestinal infection',
        excuse_start: `${year}-${month}-${d1}`,
        excuse_end: `${year}-${month}-${d2}`,
        custom_body: ''
    });

    // Sync custom_body with template
    useEffect(() => {
        const startStr = new Date(details.excuse_start).toLocaleDateString();
        const endStr = new Date(details.excuse_end).toLocaleDateString();
        const body = `Following clinical evaluation, the patient has been diagnosed with ${details.diagnosis}. It is medically necessary for the individual to be excused from work duties from ${startStr} to ${endStr} (inclusive) for recovery and to avoid further complications.`;
        setDetails(prev => ({ ...prev, custom_body: body }));
    }, [details.diagnosis, details.excuse_start, details.excuse_end]);

    const isValidStep1 = details.location && details.nurse_assigned && details.diagnosis && details.excuse_start && details.excuse_end;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-3xl shadow-2xl w-full max-w-lg fade-in overflow-hidden"
                style={{ background: 'var(--card-bg)' }}
                onClick={(e) => e.stopPropagation()}>
                <div className="p-8 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-wash)' }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                            <ClipboardList size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight " style={{ color: 'var(--text-primary)' }}>Certificate Details</h2>
                            <p className="text-[10px] font-extrabold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>Page {step} of 3 • {step === 1 ? 'Medical Information' : 'Review Body Template'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-slate-200/50 hover:scale-110" style={{ color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {step === 1 ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 relative">
                                <label className="block text-[10px] font-semibold  uppercase tracking-widest mb-2">Location</label>
                                <select
                                    value={details.location}
                                    onChange={(e) => setDetails({ ...details, location: e.target.value })}
                                    className="w-full rounded-2xl px-5 py-3.5 text-sm font-medium outline-none transition-all appearance-none pr-10"
                                    style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                >
                                    {campuses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    {campuses.length === 0 && <option value="Maysan">Maysan</option>}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-[42px] pointer-events-none text-slate-400" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-semibold  uppercase tracking-widest mb-2">Nurse Assigned</label>
                                <input
                                    value={details.nurse_assigned}
                                    onChange={(e) => setDetails({ ...details, nurse_assigned: e.target.value })}
                                    placeholder="Enter nurse name"
                                    className="w-full rounded-2xl px-5 py-3.5 text-sm font-medium outline-none transition-all"
                                    style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-semibold  uppercase tracking-widest mb-2">Diagnosis</label>
                                <input
                                    value={details.diagnosis}
                                    onChange={(e) => setDetails({ ...details, diagnosis: e.target.value })}
                                    placeholder="e.g. gastrointestinal infection"
                                    className="w-full rounded-2xl px-5 py-3.5 text-sm font-medium outline-none transition-all"
                                    style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold  uppercase tracking-widest mb-2">Rest From</label>
                                <input
                                    type="date"
                                    value={details.excuse_start}
                                    onChange={(e) => setDetails({ ...details, excuse_start: e.target.value })}
                                    className="w-full rounded-2xl px-5 py-3.5 text-sm font-medium outline-none transition-all"
                                    style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold  uppercase tracking-widest mb-2">Rest Til</label>
                                <input
                                    type="date"
                                    value={details.excuse_end}
                                    onChange={(e) => setDetails({ ...details, excuse_end: e.target.value })}
                                    className="w-full rounded-2xl px-5 py-3.5 text-sm font-medium outline-none transition-all"
                                    style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 fade-in">
                            <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2">Certificate Body Text (Preview)</label>
                                <textarea
                                    value={details.custom_body}
                                    readOnly
                                    rows={8}
                                    className="w-full rounded-2xl px-5 py-4 text-sm font-medium outline-none transition-all resize-none opacity-90 leading-relaxed"
                                    style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                                />
                                <div className="mt-3 p-4 rounded-xl border border-dashed text-[10px] font-bold uppercase tracking-tight text-slate-400" style={{ borderColor: 'var(--border)' }}>
                                    This text is dynamically generated based on the medical info from Step 1.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t flex gap-3" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border)' }}>
                    {step === 2 && (
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                        >
                            Back
                        </button>
                    )}
                    <button
                        disabled={step === 1 && !isValidStep1}
                        onClick={() => {
                            if (step === 1) setStep(2);
                            else onGenerate(details);
                        }}
                        className="btn-cta flex-[2] py-3.5 rounded-2xl text-sm font-semibold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40"
                    >
                        {step === 1 ? 'Next Step' : 'Generate Preview'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---- Cert Preview Modal ----
function CertPreviewModal({
    blobUrl,
    onClose,
    onConfirm,
    onEdit,
    isSubmitting
}: {
    blobUrl: string;
    onClose: () => void;
    onConfirm: () => void;
    onEdit: () => void;
    isSubmitting: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] fade-in overflow-hidden flex flex-col" style={{ background: 'var(--card-bg)' }} onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b flex items-center justify-between" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Review Medical Certificate</h2>
                            <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Final Validation Before Approval</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-100" style={{ color: 'var(--text-muted)' }}>
                        <X size={20} />
                    </button>
                    <button
                        onClick={onEdit}
                        className="px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2"
                        style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                    >
                        <Edit size={14} />
                        Edit Details
                    </button>
                </div>

                <div className="flex-1 bg-slate-100 p-4">
                    <iframe src={blobUrl} className="w-full h-full rounded-xl border " title="Medical Certificate Preview" />
                </div>

                <div className="p-6 border-t flex gap-4" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border)' }}>
                    <button
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="btn-cta flex-1 py-3.5 rounded-2xl text-sm font-semibold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40"
                    >
                        {isSubmitting ? 'Approving Request...' : 'Complete & Download PDF Certificate'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---- View Cert Request Modal ----
function ViewCertRequestModal({
    request,
    onClose,
    onStatusChange,
    onEdit,
    onDelete,
    isSubmitting
}: {
    request: MedicalCertRequest;
    onClose: () => void;
    onStatusChange: (status: string) => void;
    onEdit: () => void;
    onDelete: () => void;
    isSubmitting: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-3xl shadow-2xl w-full max-w-2xl fade-in overflow-hidden" style={{ background: 'var(--card-bg)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-8 border-b" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-wash)' }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                            <FileText size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Medical Certificate Request</h2>
                                {request.admin_created && (
                                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 border-2 border-amber-200 shadow-sm animate-pulse">Admin Created Request</span>
                                )}
                            </div>
                            <p className="text-[10px] font-extrabold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>Status: {request.status} • Tracking #{request.id.substring(0, 8)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {request.admin_created && (
                            <div className="flex items-center gap-2 mr-2">
                                <button onClick={onEdit} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={onDelete} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                        <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-slate-200/50 hover:scale-110" style={{ color: 'var(--text-muted)' }}>
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-semibold  uppercase tracking-widest mb-2">Requester Information</p>
                                <div className="rounded-2xl p-4" style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)' }}>
                                    <h4 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>{request.requester_name}</h4>
                                    <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>ID: {request.requester_student_number}</p>
                                    <div className="flex items-center gap-2 mt-3 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                                        <Phone size={12} /> {request.contact_number}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold  uppercase tracking-widest mb-2">Requested Date</p>
                                <p className="text-sm font-bold  flex items-center gap-2">
                                    <Calendar size={14} className="text-slate-300" />
                                    {new Date(request.requested_tst).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Purpose of Request</p>
                                <p className="text-sm font-medium leading-relaxed p-4 rounded-2xl border italic" style={{ background: 'var(--bg-wash)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                                    "{request.request_reason || 'No specific reason provided.'}"
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold  uppercase tracking-widest mb-2">Supporting Document</p>
                                {request.uploaded_id_img ? (
                                    <div className="relative aspect-video rounded-2xl bg-slate-100 border  overflow-hidden group">
                                        <img
                                            src={request.uploaded_id_img}
                                            alt="Supporting ID"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <a
                                                href={request.uploaded_id_img}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-4 py-2  rounded-xl text-xs font-semibold uppercase tracking-widest"
                                            >
                                                View Original
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="aspect-video rounded-2xl  flex flex-col items-center justify-center text-slate-300 border-2 border-dashed ">
                                        <Eye size={24} className="opacity-20 mb-2" />
                                        <p className="text-[10px] font-bold">No Image Uploaded</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6  border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex-1 flex gap-2">
                        {request.status === 'PENDING' && (
                            <>
                                <button
                                    onClick={() => onStatusChange('REJECTED')}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all active:scale-95 border border-red-100"
                                >
                                    Decline Request
                                </button>
                                <button
                                    onClick={() => onStatusChange('COMPLETED')}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all active:scale-95"
                                >
                                    Approve & Process
                                </button>
                            </>
                        )}
                        {request.status !== 'PENDING' && (
                            <div className={`flex-1 py-3 flex items-center justify-center rounded-2xl border ${request.status === 'COMPLETED' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
                                }`}>
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${request.status === 'COMPLETED' ? 'text-emerald-600' : 'text-red-600'
                                    }`}>
                                    Status: {request.status}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---- View Medicine Request Modal ----
export function ViewMedicineRequestModal({
    request,
    onClose,
    onStatusChange,
    onEdit,
    onDelete,
    isSubmitting
}: {
    request: MedicineRequest;
    onClose: () => void;
    onStatusChange: (status: string) => void;
    onEdit: () => void;
    onDelete: () => void;
    isSubmitting: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-3xl shadow-2xl w-full max-w-2xl fade-in overflow-hidden" style={{ background: 'var(--card-bg)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-8 border-b" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-wash)' }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                            <Package size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Medicine Request</h2>
                                {request.admin_created && (
                                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 border-2 border-amber-200 shadow-sm animate-pulse">Admin Created Request</span>
                                )}
                            </div>
                            <p className="text-[10px] font-extrabold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>Request Details Tracking #{request.id.substring(0, 8)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {request.admin_created && (
                            <div className="flex items-center gap-2 mr-2">
                                <button onClick={onEdit} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={onDelete} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                        <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-slate-200/50 hover:scale-110" style={{ color: 'var(--text-muted)' }}>
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-semibold  uppercase tracking-widest mb-2">Requester Information</p>
                                <div className="rounded-2xl p-4" style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)' }}>
                                    <h4 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>{request.requester_name}</h4>
                                    <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>ID: {request.requester_student_number}</p>
                                    <div className="flex items-center gap-2 mt-3 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                                        <Phone size={12} /> {request.contact_number}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold  uppercase tracking-widest mb-2">Requested Date</p>
                                <p className="text-sm font-bold  flex items-center gap-2">
                                    <Calendar size={14} className="text-slate-300" />
                                    {new Date(request.requested_tst).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Medicine Requested</p>
                                <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-wash)', border: '1px solid var(--border-light)' }}>
                                    <h4 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>{request.medicine}</h4>
                                    <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>Quantity: {request.medicine_qty} units</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Reason for Request</p>
                                <p className="text-sm font-medium leading-relaxed p-4 rounded-2xl border italic" style={{ background: 'var(--bg-wash)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                                    "{request.request_reason || 'No specific reason provided.'}"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6  border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex-1 flex gap-2">
                        {request.status === 'PENDING' && (
                            <>
                                <button
                                    onClick={() => onStatusChange('REJECTED')}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all active:scale-95 border border-red-100"
                                >
                                    Reject Request
                                </button>
                                <button
                                    onClick={() => onStatusChange('ACCEPTED')}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all active:scale-95"
                                >
                                    Approve Request
                                </button>
                            </>
                        )}
                        {request.status === 'ACCEPTED' && (
                            <>
                                <button
                                    onClick={() => onStatusChange('REJECTED')}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all active:scale-95 border border-red-100"
                                >
                                    Reject Request
                                </button>
                                <button
                                    onClick={() => onStatusChange('DISPENSED')}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 bg-blue-500 text-white hover:bg-blue-600 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all active:scale-95 shadow-md hover:shadow-lg hover:shadow-blue-500/20"
                                >
                                    Mark as Dispensed
                                </button>
                            </>
                        )}
                        {(request.status === 'DISPENSED' || request.status === 'REJECTED') && (
                            <div className={`flex-1 py-3 flex items-center justify-center rounded-2xl border ${request.status === 'DISPENSED' ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'
                                }`}>
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${request.status === 'DISPENSED' ? 'text-blue-600' : 'text-red-600'
                                    }`}>
                                    Status: {request.status}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---- Reject Reason Modal ----
export function RejectReasonModal({
    request,
    onClose,
    onConfirm,
    isSubmitting
}: {
    request: MedicalCertRequest | MedicineRequest | null;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    isSubmitting: boolean;
}) {
    const [reason, setReason] = useState('');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div
                className="rounded-2xl w-full max-w-md fade-in overflow-hidden"
                style={{
                    background: 'var(--card-bg)',
                    boxShadow: 'var(--shadow-xl)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 flex items-center justify-between"
                    style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-wash)' }}>
                    <div>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--danger)' }}>Decline Request</h3>
                        <p className="text-[10px] font-medium uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            Decline request from {request?.requester_name}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="p-3 rounded-xl border border-red-100 bg-red-50/30">
                        <p className="text-xs text-red-800 leading-relaxed">
                            Are you sure you want to decline this request? This action will notify the student.
                        </p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Reason for Rejection</label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Please provide a brief explanation..."
                            className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all min-h-[100px] resize-none"
                            style={{
                                background: 'var(--bg-wash)',
                                border: '1px solid var(--border-light)',
                                color: 'var(--text-primary)',
                            }}
                        />
                    </div>
                </div>

                <div className="p-6 flex gap-3" style={{ background: 'var(--bg-wash)', borderTop: '1px solid var(--border)' }}>
                    <button
                        onClick={() => onConfirm(reason)}
                        disabled={!reason.trim() || isSubmitting}
                        className="flex-1 py-3.5 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40"
                        style={{ background: 'var(--danger)', color: 'white' }}
                    >
                        {isSubmitting ? 'Processing...' : 'Decline Request'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---- Main Medical Requests Page ----
export default function MedicalRequests() {
    const { medicalCertRequests, medicineRequests } = useStore();
    const [activeTab, setActiveTab] = useState<'CERTS' | 'MEDS'>('CERTS');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [reqDateSort, setReqDateSort] = useState<'ASC' | 'DESC'>('DESC');

    const [viewCert, setViewCert] = useState<MedicalCertRequest | null>(null);
    const [viewMed, setViewMed] = useState<MedicineRequest | null>(null);

    const [confirmAction, setConfirmAction] = useState<{ req: MedicalCertRequest | MedicineRequest, status: string, type: 'CERTS' | 'MEDS' } | null>(null);
    const [rejectAction, setRejectAction] = useState<{ req: MedicalCertRequest | MedicineRequest, type: 'CERTS' | 'MEDS' } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ req: MedicalCertRequest | MedicineRequest, type: 'CERTS' | 'MEDS' } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // PDF Preview
    const [previewCertUrl, setPreviewCertUrl] = useState<string | null>(null);
    const [certToProcess, setCertToProcess] = useState<MedicalCertRequest | null>(null);
    const [showProcessDetails, setShowProcessDetails] = useState(false);
    const [currentCertDetails, setCurrentCertDetails] = useState<CertDetails | null>(null);
    const [showNewRequestModal, setShowNewRequestModal] = useState(false);
    const [showNewMedRequestModal, setShowNewMedRequestModal] = useState(false);
    const [editCert, setEditCert] = useState<MedicalCertRequest | null>(null);
    const [editMed, setEditMed] = useState<MedicineRequest | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchMedicalCertRequestsFromDB();
        fetchMedicineRequestsFromDB();
    }, []);

    const location = useLocation();

    useEffect(() => {
        if (location.state?.viewId) {
            if (location.state?.tab === 'certificate') {
                setActiveTab('CERTS');
                const cert = medicalCertRequests.find(c => c.id === location.state.viewId);
                if (cert) setViewCert(cert);
            } else if (location.state?.tab === 'medicine') {
                setActiveTab('MEDS');
                const med = medicineRequests.find(m => m.id === location.state.viewId);
                if (med) setViewMed(med);
            }
            window.history.replaceState({}, document.title);
        }
    }, [location.state, medicalCertRequests, medicineRequests]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, activeTab]);

    const filteredCerts = useMemo(() => {
        const filtered = medicalCertRequests.filter(req => {
            const matchesSearch =
                req.requester_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                req.requester_student_number?.includes(searchTerm);
            const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        return [...filtered].sort((a, b) => {
            const dateA = new Date(a.requested_tst).getTime();
            const dateB = new Date(b.requested_tst).getTime();
            return reqDateSort === 'ASC' ? dateA - dateB : dateB - dateA;
        });
    }, [medicalCertRequests, searchTerm, statusFilter, reqDateSort]);

    const filteredMeds = useMemo(() => {
        const filtered = medicineRequests.filter(req => {
            const matchesSearch =
                req.requester_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                req.requester_student_number?.includes(searchTerm) ||
                req.medicine?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        return [...filtered].sort((a, b) => {
            const dateA = new Date(a.requested_tst).getTime();
            const dateB = new Date(b.requested_tst).getTime();
            return reqDateSort === 'ASC' ? dateA - dateB : dateB - dateA;
        });
    }, [medicineRequests, searchTerm, statusFilter, reqDateSort]);

    const totalPages = activeTab === 'CERTS'
        ? Math.ceil(filteredCerts.length / itemsPerPage)
        : Math.ceil(filteredMeds.length / itemsPerPage);

    const paginatedItems = activeTab === 'CERTS'
        ? filteredCerts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
        : filteredMeds.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleUpdateStatus = async (reason?: string) => {
        const action = confirmAction || (rejectAction ? { ...rejectAction, status: 'REJECTED' } : null);
        if (!action || !action.req) return;
        setIsSubmitting(true);

        try {
            if (action.type === 'CERTS') {
                await updateMedicalCertStatusDB(action.req.id, action.status, reason);
                addLog('Admin', `Updated medical cert request ${action.req.id} status to ${action.status}`);

                await notifyIndividual(
                    action.req.requester_id,
                    'Medical Certificate Update',
                    `The status of your medical certificate request for ${action.req.request_reason} has been moved to ${action.status}.`,
                    `medical_cert_${action.status.toLowerCase()}` as NotificationType,
                    action.req.id
                );
            } else {
                const medReq = action.req as MedicineRequest;
                await updateMedicineRequestStatusDB(medReq.id, action.status, medReq.medicine, medReq.medicine_qty, reason);
                addLog('Admin', `Updated medicine request ${medReq.id} status to ${action.status}`);

                let notifyMsg = `The status of your medicine request for ${medReq.medicine} (${medReq.medicine_qty} units) has been moved to ${action.status}.`;
                if (action.status === 'ACCEPTED') {
                    notifyMsg = `Your medicine request for ${medReq.medicine} has been approved. Please proceed to the clinic to receive your medicine.`;
                } else if (action.status === 'DISPENSED') {
                    notifyMsg = `Your requested medicine ${medReq.medicine} has been dispensed successfully.`;
                }

                await notifyIndividual(
                    medReq.requester_id,
                    'Medicine Request Update',
                    notifyMsg,
                    `medicine_request_${action.status.toLowerCase()}` as NotificationType,
                    medReq.id
                );
            }
            setConfirmAction(null);
            setRejectAction(null);
            setViewCert(null);
            setViewMed(null);
        } catch (e: any) {
            alert(e.message || 'Action failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFinalizeCert = async () => {
        if (!certToProcess || !previewCertUrl) return;
        setIsSubmitting(true);
        try {
            await updateMedicalCertStatusDB(certToProcess.id, 'COMPLETED');
            addLog('Admin', `Approved and generated medical cert for ${certToProcess.requester_name}`);

            await notifyIndividual(
                certToProcess.requester_id,
                'Medical Certificate Approved',
                `Your medical certificate request for ${certToProcess.request_reason} has been approved and processed.`,
                'medical_cert_completed',
                certToProcess.id
            );

            const link = document.createElement('a');
            link.href = previewCertUrl;
            link.download = `Medical_Cert_${certToProcess.requester_name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setCertToProcess(null);
            setPreviewCertUrl(null);
            setViewCert(null);
        } catch (e: any) {
            alert(e.message || 'Finalization failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRequest = async () => {
        if (!confirmDelete) return;
        setIsSubmitting(true);
        try {
            if (confirmDelete.type === 'CERTS') {
                await deleteMedicalCertRequestDB(confirmDelete.req.id);
                addLog('Admin', `Deleted medical cert request ${confirmDelete.req.id}`);
            } else {
                await deleteMedicineRequestDB(confirmDelete.req.id);
                addLog('Admin', `Deleted medicine request ${confirmDelete.req.id}`);
            }
            setConfirmDelete(null);
        } catch (e: any) {
            alert(e.message || 'Deletion failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate Stats for Sidebar
    const stats = useMemo(() => {
        const certs = medicalCertRequests;
        const meds = medicineRequests;

        return {
            certs: {
                pending: certs.filter(r => r.status === 'PENDING').length,
                completed: certs.filter(r => r.status === 'COMPLETED').length,
                total: certs.length
            },
            meds: {
                pending: meds.filter(r => r.status === 'PENDING').length,
                dispensed: meds.filter(r => r.status === 'DISPENSED').length,
                total: meds.length
            }
        };
    }, [medicalCertRequests, medicineRequests]);

    return (
        <div className={`medical-requests ${activeTab === 'MEDS' ? 'medical-requests--meds' : ''} max-w-none`}>
            <div className="flex flex-col xl:flex-row gap-8 w-full">
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col gap-6">
                    {/* Page Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h2 className="medical-requests-header-title" style={{ color: 'var(--text-primary)' }}>Student Service Requests</h2>
                            <p className="medical-requests-header-subtitle mt-1.5">Manage, verify, and approve medical certificates and medicine requests.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex flex-col items-end">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Status</span>
                                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active Processing
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Tab Switcher & Create Button Row */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="inline-flex p-1.5 rounded-2xl" style={{ background: 'var(--bg-wash)', border: '1px solid var(--border-light)' }}>
                            <button
                                onClick={() => setActiveTab('CERTS')}
                                className={`px-8 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === 'CERTS' ? 'shadow-md scale-105 z-10' : 'opacity-60 hover:opacity-100'}`}
                                style={{
                                    background: activeTab === 'CERTS' ? 'var(--card-bg)' : 'transparent',
                                    color: activeTab === 'CERTS' ? 'var(--accent)' : 'var(--text-faint)',
                                    border: activeTab === 'CERTS' ? '1px solid var(--border-light)' : 'none',
                                    fontFamily: 'Poppins, sans-serif'
                                }}
                            >
                                Medical Certificates
                            </button>
                            <button
                                onClick={() => setActiveTab('MEDS')}
                                className={`px-8 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === 'MEDS' ? 'shadow-md scale-105 z-10' : 'opacity-60 hover:opacity-100'}`}
                                style={{
                                    background: activeTab === 'MEDS' ? 'var(--card-bg)' : 'transparent',
                                    color: activeTab === 'MEDS' ? 'var(--success)' : 'var(--text-faint)',
                                    border: activeTab === 'MEDS' ? '1px solid var(--border-light)' : 'none',
                                    fontFamily: 'Poppins, sans-serif'
                                }}
                            >
                                Medicine Requests
                            </button>
                        </div>

                        {activeTab === 'CERTS' ? (
                            <button
                                onClick={() => setShowNewRequestModal(true)}
                                className="btn-cta flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20 shrink-0"
                            >
                                <Plus size={18} /> Create Certificate Request
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowNewMedRequestModal(true)}
                                className="btn-cta flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/20 shrink-0"
                                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                            >
                                <Plus size={18} /> Create Medicine Request
                            </button>
                        )}
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="rounded-2xl p-4 flex flex-wrap items-center gap-4 transition-colors"
                        style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                        <div className="relative flex-1 max-w-sm group">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-faint)' }} />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={`Search by name, ID${activeTab === 'MEDS' ? ', or medicine' : ''}…`}
                                className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl outline-none font-normal transition-colors"
                                style={{ background: 'var(--bg-wash)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="appearance-none rounded-xl px-5 py-2.5 pr-10 text-xs font-bold uppercase tracking-wider outline-none transition-all cursor-pointer"
                                    style={{ background: 'var(--bg-wash)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
                                >
                                    <option value="ALL">Status: All</option>
                                    <option value="PENDING">Pending Approval</option>
                                    {activeTab === 'CERTS' ? (
                                        <option value="COMPLETED">Completed/Issued</option>
                                    ) : (
                                        <>
                                            <option value="ACCEPTED">Approved/Ready</option>
                                            <option value="DISPENSED">Successfully Issued</option>
                                        </>
                                    )}
                                    <option value="REJECTED">Request Declined</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                            </div>
                        </div>
                    </div>

                    {/* Requests Table */}
                    <div className="w-full rounded-3xl overflow-hidden flex flex-col shadow-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', minHeight: '520px' }}>
                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full border-collapse medical-requests-card-table">
                                <thead>
                                    <tr style={{ background: 'var(--bg-wash)' }}>
                                        <th className="text-left text-[10px] font-extrabold uppercase tracking-widest px-6 py-4" style={{ color: 'var(--text-muted)', fontFamily: 'Poppins, sans-serif' }}>Student Details</th>
                                        <th
                                            className="text-left text-[10px] font-extrabold uppercase tracking-widest px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group/sort"
                                            style={{ color: 'var(--text-muted)', fontFamily: 'Poppins, sans-serif' }}
                                            onClick={() => setReqDateSort(p => p === 'ASC' ? 'DESC' : 'ASC')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Requested Date
                                                {reqDateSort === 'ASC' ? <ArrowUp size={12} className="text-blue-500" /> : <ArrowDown size={12} className="text-blue-500" />}
                                            </div>
                                        </th>
                                        <th className="text-left text-[10px] font-extrabold uppercase tracking-widest px-6 py-4" style={{ color: 'var(--text-muted)', fontFamily: 'Poppins, sans-serif' }}>
                                            {activeTab === 'CERTS' ? 'Clinical Purpose' : 'Item Info'}
                                        </th>
                                        <th className="text-left text-[10px] font-extrabold uppercase tracking-widest px-6 py-4" style={{ color: 'var(--text-muted)', fontFamily: 'Poppins, sans-serif' }}>Current Status</th>
                                        <th className="text-right text-[10px] font-extrabold uppercase tracking-widest px-6 py-4" style={{ color: 'var(--text-muted)', fontFamily: 'Poppins, sans-serif' }}>Management</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-32 text-center">
                                                <div className="flex flex-col items-center justify-center opacity-40">
                                                    <ClipboardList size={48} className="mb-3" />
                                                    <p className="text-sm font-bold uppercase tracking-widest">No matching requests found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedItems.map(req => (
                                            <tr key={req.id} className="transition-all group" style={{ borderBottom: '1px solid var(--border-light)' }}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${activeTab === 'CERTS' ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>
                                                            <User size={18} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>{req.requester_name}</span>

                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                                                                    ID: {req.requester_student_number}
                                                                </span>

                                                                {req.admin_created && (
                                                                    <span className="px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider bg-amber-100 text-amber-600 border border-amber-200 shrink-0">
                                                                        Admin Created
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-slate-600">
                                                            {new Date(req.requested_tst).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-300">
                                                            {new Date(req.requested_tst).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 max-w-[280px]">
                                                    {activeTab === 'CERTS' ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-slate-500 line-clamp-1 italic">
                                                                "{(req as MedicalCertRequest).request_reason}"
                                                            </span>
                                                            <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-300 mt-1">Stated Reason</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                                <Pill size={14} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{(req as MedicineRequest).medicine}</span>
                                                                <span className="text-[10px] uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md w-fit mt-1">Qty: {(req as MedicineRequest).medicine_qty} Units</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`status-badge-modern ${req.status === 'PENDING' ? 'status-badge-pending' :
                                                        req.status === 'COMPLETED' ? 'status-badge-completed' :
                                                            req.status === 'ACCEPTED' ? 'status-badge-upcoming' :
                                                                req.status === 'DISPENSED' ? 'status-badge-completed' :
                                                                    'status-badge-cancelled'
                                                        }`}>
                                                        {req.status === 'ACCEPTED' ? 'Approved' : req.status.charAt(0) + req.status.slice(1).toLowerCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2.5">
                                                        {req.status === 'PENDING' && (
                                                            <button
                                                                onClick={() => {
                                                                    if (activeTab === 'CERTS') {
                                                                        setCertToProcess(req as MedicalCertRequest);
                                                                        setShowProcessDetails(true);
                                                                    } else {
                                                                        setConfirmAction({ req, status: 'ACCEPTED', type: 'MEDS' });
                                                                    }
                                                                }}
                                                                className="action-icon-button bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-100"
                                                                title="Approve Request"
                                                            >
                                                                <Check size={16} />
                                                            </button>
                                                        )}
                                                        {req.status === 'ACCEPTED' && activeTab === 'MEDS' && (
                                                            <button
                                                                onClick={() => setConfirmAction({ req, status: 'DISPENSED', type: 'MEDS' })}
                                                                className="action-icon-button bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-100 shadow-md hover:shadow-blue-500/20"
                                                                title="Dispense Medicine"
                                                            >
                                                                <Package size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => activeTab === 'CERTS' ? setViewCert(req as MedicalCertRequest) : setViewMed(req as MedicineRequest)}
                                                            className="action-icon-button hover:bg-slate-100"
                                                            style={{ border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        {(req.status === 'PENDING' || (req.status === 'ACCEPTED' && activeTab === 'MEDS')) && (
                                                            <button
                                                                onClick={() => setRejectAction({ req, type: activeTab })}
                                                                className="action-icon-button bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border border-red-100"
                                                                title="Decline Request"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'var(--bg-wash)', borderTop: '1px solid var(--border-light)' }}>
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                                Showing <span className="text-slate-900">{paginatedItems.length}</span> of <span className="text-slate-900">{activeTab === 'CERTS' ? filteredCerts.length : filteredMeds.length}</span> Results
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 border border-slate-200 hover:bg-slate-50 transition-all "
                                >
                                    Previous
                                </button>
                                <div className="flex items-center gap-1.5">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all  ${currentPage === page ? 'bg-[var(--accent)] text-white shadow-lg scale-110' : 'text-slate-400 hover:bg-slate-100'}`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 border border-slate-200 hover:bg-slate-50 transition-all "
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Stats & Info Area */}
                <aside className="w-full xl:w-80 flex flex-col gap-6 shrink-0">
                    {/* Active Tab Stats */}
                    <div className="rounded-2xl p-6 shadow-sm border space-y-6" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)' }}>
                        <div>
                            <h3 className="text-sm font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                                {activeTab === 'CERTS' ? 'Certificate Overview' : 'Medicine Dispatch Summary'}
                            </h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Real-time status updates</p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 rounded-xl flex items-center justify-between" style={{ background: 'var(--bg-wash)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100">
                                        <Clock size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Pending</p>
                                        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                            {activeTab === 'CERTS' ? stats.certs.pending : stats.meds.pending}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl flex items-center justify-between" style={{ background: 'var(--bg-wash)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100">
                                        <Check size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            {activeTab === 'CERTS' ? 'Issued MedCerts' : 'Dispensed Meds'}
                                        </p>
                                        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                            {activeTab === 'CERTS' ? stats.certs.completed : stats.meds.dispensed}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-light)' }}>
                            <span className="text-[11px] font-bold text-slate-400">Success Rate</span>
                            <span className="text-[11px] font-black text-emerald-600">
                                {activeTab === 'CERTS' 
                                    ? (stats.certs.total > 0 ? Math.round((stats.certs.completed / stats.certs.total) * 100) : 0)
                                    : (stats.meds.total > 0 ? Math.round((stats.meds.dispensed / stats.meds.total) * 100) : 0)
                                }%
                            </span>
                        </div>
                    </div>

                    {/* Quick Activity or Tips */}
                    <div className="rounded-2xl p-6 shadow-sm border overflow-hidden relative" style={{ background: 'var(--cta-gradient)', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <ShieldCheck size={80} color="#fff" />
                        </div>
                        <h4 className="text-white font-bold text-sm mb-2 relative z-10">Administrative Insight</h4>
                        <p className="text-blue-100 text-[11px] leading-relaxed opacity-90 relative z-10">
                            Certificates marked as 'Admin Created' are processed immediately without student-uploaded ID verification.
                        </p>
                        <button 
                            onClick={() => window.open('https://support.google.com/calendar', '_blank')}
                            className="mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider transition-all border border-white/20 relative z-10"
                        >
                            View Docs
                        </button>
                    </div>

                    {/* Recent Inquiries Quick Link */}
                    <div className="rounded-2xl p-6 shadow-sm border" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-500">
                                <MessageSquare size={16} />
                            </div>
                            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Student Inquiries</h4>
                        </div>
                        <p className="text-xs text-slate-400 mb-4 leading-relaxed">Have questions about medical procedures? Check the inquiries dashboard.</p>
                        <a href="/inquiries" className="text-[11px] font-black text-blue-500 hover:underline uppercase tracking-widest flex items-center gap-2">
                            Go to Inquiries <ExternalLink size={12} />
                        </a>
                    </div>
                </aside>
            </div>

            {/* Modals */}
            {viewCert && (
                <ViewCertRequestModal
                    request={viewCert}
                    onClose={() => setViewCert(null)}
                    onEdit={() => {
                        setEditCert(viewCert);
                        setViewCert(null);
                    }}
                    onDelete={() => {
                        setConfirmDelete({ req: viewCert, type: 'CERTS' });
                        setViewCert(null);
                    }}
                    onStatusChange={(status) => {
                        if (status === 'COMPLETED') {
                            setCertToProcess(viewCert);
                            setShowProcessDetails(true);
                        } else if (status === 'REJECTED') {
                            setRejectAction({ req: viewCert, type: 'CERTS' });
                            setViewCert(null);
                        } else {
                            setConfirmAction({ req: viewCert, status, type: 'CERTS' });
                        }
                    }}
                    isSubmitting={isSubmitting}
                />
            )}

            {showProcessDetails && certToProcess && (
                <CertProcessingModal
                    onClose={() => setShowProcessDetails(false)}
                    initialDetails={currentCertDetails}
                    onGenerate={(details) => {
                        setCurrentCertDetails(details);
                        const url = generateMedicalCertPDF(certToProcess, details);
                        setPreviewCertUrl(url);
                        setShowProcessDetails(false);
                    }}
                />
            )}

            {previewCertUrl && (
                <CertPreviewModal
                    blobUrl={previewCertUrl}
                    onClose={() => setPreviewCertUrl(null)}
                    onEdit={() => {
                        setPreviewCertUrl(null);
                        setShowProcessDetails(true);
                    }}
                    onConfirm={handleFinalizeCert}
                    isSubmitting={isSubmitting}
                />
            )}

            {viewMed && (
                <ViewMedicineRequestModal
                    request={viewMed}
                    onClose={() => setViewMed(null)}
                    onEdit={() => {
                        setEditMed(viewMed);
                        setViewMed(null);
                    }}
                    onDelete={() => {
                        setConfirmDelete({ req: viewMed, type: 'MEDS' });
                        setViewMed(null);
                    }}
                    onStatusChange={(status) => {
                        if (status === 'REJECTED') {
                            setRejectAction({ req: viewMed, type: 'MEDS' });
                            setViewMed(null);
                        } else {
                            setConfirmAction({ req: viewMed, status, type: 'MEDS' });
                        }
                    }}
                    isSubmitting={isSubmitting}
                />
            )}

            <ConfirmationDialog
                isOpen={!!confirmAction && !rejectAction}
                title="Confirm Action"
                description={`Are you sure you want to ${confirmAction?.status === 'DISPENSED' ? 'mark this request as dispensed' : confirmAction?.status.toLowerCase() + ' this request'}?`}
                confirmText={confirmAction?.status === 'DISPENSED' ? "Yes, Dispense" : "Yes, Proceed"}
                type={confirmAction?.status === 'REJECTED' ? 'danger' : 'info'}
                isLoading={isSubmitting}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => handleUpdateStatus()}
            />

            {rejectAction && (
                <RejectReasonModal
                    request={rejectAction.req}
                    onClose={() => setRejectAction(null)}
                    onConfirm={handleUpdateStatus}
                    isSubmitting={isSubmitting}
                />
            )}

            {(showNewRequestModal || editCert) && (
                <NewCertRequestModal
                    initialData={editCert || undefined}
                    onClose={() => {
                        setShowNewRequestModal(false);
                        setEditCert(null);
                    }}
                    isSubmitting={isSubmitting}
                    onSave={async (data) => {
                        setIsSubmitting(true);
                        try {
                            if (editCert) {
                                await updateMedicalCertRequestDB(editCert.id, data);
                                addLog('Admin', `Updated medical cert request ${editCert.id}`);
                                setEditCert(null);
                            } else {
                                await addMedicalCertRequestDB({ ...data, admin_created: true, status: 'PENDING' });
                                addLog('Admin', `Manually created medical cert request for user ID: ${data.requester_id}`);
                            }
                            setShowNewRequestModal(false);
                        } catch (e: any) {
                            alert(e.message || 'Failed to save request.');
                        } finally {
                            setIsSubmitting(false);
                        }
                    }}
                />
            )}

            {(showNewMedRequestModal || editMed) && (
                <NewMedRequestModal
                    initialData={editMed || undefined}
                    onClose={() => {
                        setShowNewMedRequestModal(false);
                        setEditMed(null);
                    }}
                    isSubmitting={isSubmitting}
                    onSave={async (data) => {
                        setIsSubmitting(true);
                        try {
                            if (editMed) {
                                await updateMedicineRequestDB(editMed.id, data);
                                addLog('Admin', `Updated medicine request ${editMed.id}`);
                                setEditMed(null);
                            } else {
                                await addMedicineRequestDB({ ...data, admin_created: true, status: 'PENDING' });
                                addLog('Admin', `Manually created medicine request for user ID: ${data.requester_id}`);
                            }
                            setShowNewMedRequestModal(false);
                        } catch (e: any) {
                            alert(e.message || 'Failed to save request.');
                        } finally {
                            setIsSubmitting(false);
                        }
                    }}
                />
            )}

            <ConfirmationDialog
                isOpen={!!confirmDelete}
                title="Delete Request"
                description="Are you sure you want to permanently delete this request record? This cannot be undone."
                confirmText="Permanently Delete"
                type="danger"
                isLoading={isSubmitting}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDeleteRequest}
            />
        </div>
    );
}

// ---- New Cert Request Modal ----
function NewCertRequestModal({
    onClose,
    onSave,
    isSubmitting,
    initialData
}: {
    onClose: () => void;
    onSave: (data: Partial<MedicalCertRequest>) => Promise<void>;
    isSubmitting: boolean;
    initialData?: MedicalCertRequest;
}) {
    const { users } = useStore();
    const [step, setStep] = useState(initialData ? 2 : 1);
    const [selectedUser, setSelectedUser] = useState<SystemUser | null>(
        initialData ? (initialData.profiles as SystemUser) : null
    );
    const [search, setSearch] = useState('');

    // Form data
    const [formData, setFormData] = useState({
        requested_tst: initialData?.requested_tst ? new Date(initialData.requested_tst).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        request_reason: initialData?.request_reason || '',
        contact_number: initialData?.contact_number || '',
        uploaded_id_img: initialData?.uploaded_id_img || ''
    });

    const filteredUsers = users.filter(u =>
        u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        u.studentId?.includes(search) ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 5);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, uploaded_id_img: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const isValidStep2 = formData.request_reason && formData.contact_number && formData.uploaded_id_img;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-2xl shadow-2xl w-full max-w-lg fade-in overflow-hidden flex flex-col max-h-[90vh]"
                style={{ background: 'var(--card-bg)' }}
                onClick={(e) => e.stopPropagation()}>

                {/* Modal Header */}
                <div className="px-8 py-6 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-wash)' }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'var(--cta-gradient)', color: '#fff' }}>
                            {initialData ? <Edit2 size={24} /> : <Plus size={24} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold tracking-tight " style={{ color: 'var(--text-primary)' }}>
                                {initialData ? 'Edit medical Certificate' : 'New medical Certificate'}
                            </h2>
                            <p className="text-[10px] font-extrabold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                {initialData ? 'Manage manually created details' : `Step ${step} of 2 • ${step === 1 ? 'Search Student' : 'Upload Documentation'}`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-slate-200/50 hover:scale-110" style={{ color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                    {step === 1 ? (
                        <div className="space-y-4">
                            <div className="relative group">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search student name or ID number..."
                                    className="w-full pl-11 pr-4 py-3.5 text-sm rounded-xl outline-none transition-all"
                                    style={{ background: 'var(--bg-wash)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-3 ml-1">
                                    <div className="w-1 h-3 rounded-full bg-blue-500" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Search Results</p>
                                </div>
                                {filteredUsers.length === 0 ? (
                                    <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl bg-slate-50/50" style={{ borderColor: 'var(--border-light)' }}>
                                        <User size={32} className="text-slate-200 mb-2" />
                                        <p className="text-xs font-medium italic text-slate-400">No matching records found</p>
                                    </div>
                                ) : (
                                    filteredUsers.map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => {
                                                setSelectedUser(u);
                                                setFormData(prev => ({ ...prev, contact_number: u.contact_number || '' }));
                                                setStep(2);
                                            }}
                                            className="w-full p-4 rounded-xl border text-left transition-all hover:shadow-md hover:border-blue-400 active:scale-[0.98] group flex items-center justify-between"
                                            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)' }}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors border border-transparent group-hover:border-blue-100">
                                                    <User size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>{u.fullName || `${u.first_name} ${u.last_name}`}</p>
                                                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>ID: {u.studentId || u.student_number}</p>
                                                </div>
                                            </div>
                                            <ChevronDown size={18} className="-rotate-90 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 fade-in">
                            {/* Selected Header */}
                            <div className="p-4 rounded-xl border flex items-center gap-4 shadow-sm" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-600 border border-blue-50">
                                    <User size={22} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Assigned Requester</p>
                                    <h4 className="text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>{selectedUser?.fullName || `${selectedUser?.first_name} ${selectedUser?.last_name}`}</h4>
                                    <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>ID: {selectedUser?.studentId || selectedUser?.student_number}</p>
                                </div>
                                {!initialData && (
                                    <button
                                        onClick={() => setStep(1)}
                                        className="px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                                    >
                                        Change
                                    </button>
                                )}
                            </div>

                            {/* Section: Request Info */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-1 ml-1">
                                    <ClipboardList size={14} className="text-blue-500" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Documentation Context</h3>
                                </div>

                                <div className="p-5 rounded-2xl space-y-4 border" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Purpose of Request</label>
                                        <textarea
                                            value={formData.request_reason}
                                            onChange={(e) => setFormData(p => ({ ...p, request_reason: e.target.value }))}
                                            placeholder="Why is this certificate being requested? (e.g., Post-surgical leave, flu recovery...)"
                                            rows={3}
                                            className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none border resize-none leading-relaxed"
                                            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Contact Information</label>
                                            <div className="relative">
                                                <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    value={formData.contact_number}
                                                    onChange={(e) => setFormData(p => ({ ...p, contact_number: e.target.value }))}
                                                    placeholder="09XXXXXXXXX"
                                                    className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold outline-none border"
                                                    style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Requested Date</label>
                                            <div className="relative">
                                                <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="datetime-local"
                                                    value={formData.requested_tst}
                                                    onChange={(e) => setFormData(p => ({ ...p, requested_tst: e.target.value }))}
                                                    className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold outline-none border"
                                                    style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Identity Verification */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-1 ml-1">
                                    <Eye size={14} className="text-blue-500" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Identity Verification</h3>
                                </div>

                                <div className="p-5 rounded-2xl space-y-4 border" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                                    <div className="flex items-start gap-4">
                                        <div className="flex-1 relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="hidden"
                                                id="id-upload"
                                            />
                                            <label
                                                htmlFor="id-upload"
                                                className="w-full h-[100px] flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer hover:bg-black/5 hover:border-blue-400 transition-all text-slate-400"
                                                style={{ borderColor: 'var(--border-light)' }}
                                            >
                                                <Upload size={20} />
                                                <span className="text-[10px] font-bold uppercase tracking-wide">
                                                    {formData.uploaded_id_img ? 'Update Identification Image' : 'Click to Upload Valid ID Screenshot'}
                                                </span>
                                            </label>
                                        </div>
                                        {formData.uploaded_id_img && (
                                            <div className="w-24 h-[100px] rounded-xl overflow-hidden border shadow-sm shrink-0" style={{ borderColor: 'var(--border-light)' }}>
                                                <img src={formData.uploaded_id_img} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t flex gap-3 shrink-0" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                    {step === 2 && !initialData && (
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                            style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
                        >
                            Back
                        </button>
                    )}
                    <button
                        disabled={(step === 2 && !isValidStep2) || isSubmitting}
                        onClick={async () => {
                            if (step === 1 || !selectedUser) return;
                            await onSave({
                                requester_id: selectedUser.id,
                                requested_tst: formData.requested_tst,
                                request_reason: formData.request_reason,
                                contact_number: formData.contact_number,
                                uploaded_id_img: formData.uploaded_id_img,
                                status: initialData?.status || 'PENDING'
                            });
                        }}
                        className="btn-cta flex-[2] py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
                    >
                        {isSubmitting ? 'Processing...' : step === 1 ? 'Search Student First' : initialData ? 'Update Request Record' : 'Create Certificate Request'}
                    </button>
                </div>
            </div>
        </div>
    );
}
