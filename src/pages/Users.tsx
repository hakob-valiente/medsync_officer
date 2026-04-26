import { useState, useEffect } from 'react';
import { Search, Eye, X, Activity, HeartPulse, History, Calendar, FileText, MessageSquare, User, Image, Phone, MapPin, Mail, Utensils, Filter } from 'lucide-react';

import { useStore } from '../hooks/useStore';
import { fetchUsersFromDB, fetchVisitRecords } from '../store';
import { PaginationControl } from '../components/ui/PaginationControl';
import type { SystemUser, VisitRecord, Appointment, AcceptedAppointment, MedicalCertRequest, MedicineRequest, Inquiry, MealLog } from '../types';

const courses = [
    "BS Information Technology",
    "BS Accountancy",
    "BS Business Administration",
    "BS Public Administration",
    "Bachelor of Elementary Education",
    "Bachelor of Secondary Education",
    "BS Psychology",
    "BS Social Work",
    "BS Mathematics",
    "BA Communication"
];

// ---- Utility Functions ----
const calculateAge = (birthday?: string) => {
    if (!birthday) return '—';
    const birthDate = new Date(birthday);
    if (isNaN(birthDate.getTime())) return '—';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// ---- Health Information Modal ----
function HealthModal({ user, onClose }: {
    user: SystemUser;
    onClose: () => void;
}) {
    const { appointments, acceptedAppointments, medicalCertRequests, medicineRequests, inquiries, runLogs, mealLogs } = useStore();
    const [records, setRecords] = useState<VisitRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'visits' | 'appointments' | 'medical' | 'inquiries' | 'runs' | 'nutrition'>('visits');
    const [idSide, setIdSide] = useState<'front' | 'back'>('front');
    const [expandedImg, setExpandedImg] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 4;

    // Filter records for this user
    const userAppointments: (Appointment | AcceptedAppointment)[] = [
        ...appointments.filter(a => a.requester_id === user.id),
        ...acceptedAppointments.filter(a => a.requester_id === user.id)
    ];
    const userCerts: MedicalCertRequest[] = medicalCertRequests.filter(r => r.requester_id === user.id);
    const userMeds: MedicineRequest[] = medicineRequests.filter(r => r.requester_id === user.id);
    const userInquiries: Inquiry[] = inquiries.filter(i => i.inquirer_id === user.id);
    const userRunLogs = runLogs.filter(r => r.requester_id === user.id);
    const userMealLogs: MealLog[] = mealLogs.filter(m => m.requester_id === user.id);

    const loadRecords = async () => {
        setLoading(true);
        const data = await fetchVisitRecords(user.id);
        setRecords(data);
        setLoading(false);
    };

    useEffect(() => {
        loadRecords();
    }, [user.id]);

    const fmtDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return iso;
        }
    };

    const fmtShort = (iso: string) => {
        try { return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return iso; }
    };

    const getVitals = (rec: VisitRecord) => {
        let v = rec.vital_signs;
        if (typeof v === 'string') {
            try { v = JSON.parse(v); } catch (e) { return {}; }
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



    const tabs = [
        { key: 'visits' as const, label: 'Visit History', icon: <History size={13} />, count: records.length },
        { key: 'appointments' as const, label: 'Appointments', icon: <Calendar size={13} />, count: userAppointments.length },
        { key: 'medical' as const, label: 'Medical Requests', icon: <FileText size={13} />, count: userCerts.length + userMeds.length },
        { key: 'inquiries' as const, label: 'Inquiries', icon: <MessageSquare size={13} />, count: userInquiries.length },
        { key: 'runs' as const, label: 'Run Logs', icon: <Activity size={13} />, count: userRunLogs.length },
        { key: 'nutrition' as const, label: 'Nutrition', icon: <Utensils size={13} />, count: userMealLogs.length },
    ];

    const SkeletonRow = () => (
        <div className="animate-pulse rounded-xl border p-4 space-y-2" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-wash)' }}>
            <div className="h-3 w-1/3 rounded-full bg-slate-200" />
            <div className="h-2 w-2/3 rounded-full bg-slate-100" />
            <div className="h-2 w-1/2 rounded-full bg-slate-100" />
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-2xl shadow-2xl w-full max-w-[96rem] max-h-[95vh] overflow-hidden fade-in flex flex-col" style={{ background: 'var(--card-bg)' }} onClick={(e) => e.stopPropagation()}>

                {/* ---- Sticky Header ---- */}
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border-light)', background: 'var(--card-bg)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'var(--cta-gradient)', color: 'white' }}>
                            <Activity size={17} />
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Patient File</h2>
                            <p className="text-[10px] uppercase font-bold tracking-widest opacity-50" style={{ color: 'var(--text-muted)' }}>{user.fullName} · {user.studentId}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">

                        <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors" style={{ color: 'var(--text-muted)' }}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* ---- Gradient Hero Banner ---- */}
                    <div className="relative h-15 shrink-0" style={{ background: 'var(--cta-gradient)' }}>
                        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 20px,rgba(255,255,255,0.6) 20px,rgba(255,255,255,0.6) 21px),repeating-linear-gradient(90deg,transparent,transparent 20px,rgba(255,255,255,0.6) 20px,rgba(255,255,255,0.6) 21px)' }} />
                    </div>

                    {/* ---- Profile Identity Strip ---- */}
                    <div className="px-8 mt-3 mb-5 flex items-end justify-between border-b pb-4" style={{ borderColor: 'var(--border-light)' }}>
                        <div className="flex items-center gap-6">
                            {user.profile_picture_url ? (
                                <img
                                    src={user.profile_picture_url}
                                    className="w-20 h-20 rounded-2xl object-cover shadow-md border-2 border-white cursor-zoom-in"
                                    alt="Profile"
                                    onClick={() => setExpandedImg(user.profile_picture_url!)}
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-slate-100 text-slate-300 border-2 border-white shadow-sm">
                                    <User size={32} />
                                </div>
                            )}
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--accent)' }}>Patient Profile</p>
                                <h3 className="text-3xl font-black tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>{user.fullName}</h3>
                                <p className="text-[11px] font-bold uppercase tracking-widest mt-1 opacity-60" style={{ color: 'var(--text-muted)' }}>
                                    {user.course || ''} {user.year_level?.charAt(0) || ''}{user.section ? `-${user.section}` : ''}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <p className="text-[9px] font-bold uppercase tracking-widest opacity-30">Registered: {fmtShort(user.created_at || user.createdAt)}</p>
                        </div>
                    </div>
                    <div className="px-8 pb-8 grid grid-cols-1 xl:grid-cols-4 gap-5">

                        {/* ---- Column 1: Student Info ---- */}
                        <div className="xl:col-span-1 space-y-4">
                            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-light)' }}>
                                <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-blue-100 text-blue-600"><User size={11} /></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Student Info</span>
                                </div>
                                <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                                    {[
                                        { label: 'Email', value: user.email, icon: <Mail size={10} />, cls: 'bg-violet-50 text-violet-500' },
                                        {
                                            isDouble: true,
                                            items: [
                                                { label: 'Birthdate', value: user.birthdate, icon: <Calendar size={10} />, cls: 'bg-blue-50 text-blue-500' },
                                                { label: 'Age', value: `${calculateAge(user.birthdate)} yrs`, icon: <Activity size={10} />, cls: 'bg-emerald-50 text-emerald-500' }
                                            ]
                                        },
                                        { label: 'Sex / Gender', value: user.sex || user.gender, icon: <User size={10} />, cls: 'bg-pink-50 text-pink-500' },
                                        { label: 'Student ID', value: user.studentId, icon: <FileText size={10} />, cls: 'bg-slate-100 text-slate-400' },
                                    ].map((item: any, idx) => {
                                        if (item.isDouble) {
                                            return (
                                                <div key={idx} className="grid grid-cols-2 divide-x items-center" style={{ borderColor: 'var(--border-light)' }}>
                                                    {item.items.map((sub: any) => (
                                                        <div key={sub.label} className="flex items-center gap-3 px-4 py-3">
                                                            <div className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center ${sub.cls}`}>{sub.icon}</div>
                                                            <div className="min-w-0">
                                                                <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>{sub.label}</p>
                                                                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{sub.value || '—'}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return (
                                            <div key={item.label} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: 'var(--border-light)' }}>
                                                <div className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center ${item.cls}`}>{item.icon}</div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>{item.label}</p>
                                                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.value || '—'}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-light)' }}>
                                <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-emerald-100 text-emerald-600"><Phone size={11} /></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Info</span>
                                </div>
                                <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                                    {[
                                        { label: 'Address', value: [user.street_address, user.barangay, user.city].filter(Boolean).join(', ') || '—', icon: <MapPin size={10} />, cls: 'bg-emerald-50 text-emerald-500' },
                                        { label: 'Guardian / Contact', value: user.contact_person, icon: <User size={10} />, cls: 'bg-amber-50 text-amber-500' },
                                        { label: 'Mobile Number', value: user.contact_number, icon: <Phone size={10} />, cls: 'bg-blue-50 text-blue-500' },
                                    ].map(({ label, value, icon, cls }) => (
                                        <div key={label} className="flex items-start gap-3 px-4 py-3" style={{ borderColor: 'var(--border-light)' }}>
                                            <div className={`w-6 h-6 rounded-lg shrink-0 mt-0.5 flex items-center justify-center ${cls}`}>{icon}</div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>{label}</p>
                                                <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>{value || '—'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ---- Column 2: Medical & Health ---- */}
                        <div className="xl:col-span-1 space-y-4">
                            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-light)' }}>
                                <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-red-100 text-red-500"><HeartPulse size={11} /></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Medical & Health</span>
                                </div>
                                <div className="p-4 space-y-4">
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: 'Height', val: user.height_cm ? `${user.height_cm}cm` : '—', cls: 'bg-blue-50 text-blue-700' },
                                            { label: 'Weight', val: user.weight_kg ? `${user.weight_kg}kg` : '—', cls: 'bg-emerald-50 text-emerald-700' },
                                            { label: 'Blood', val: user.blood_type || '—', cls: 'bg-red-50 text-red-600' },
                                        ].map((item) => (
                                            <div key={item.label} className={`rounded-xl p-2.5 text-center ${item.cls}`}>
                                                <span className="block text-[8px] font-bold uppercase tracking-wider mb-1 opacity-60">{item.label}</span>
                                                <span className="text-xs font-black">{item.val}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {[
                                        { label: 'Allergies', data: user.allergies, pill: 'bg-red-50 text-red-600 border-red-100' },
                                        { label: 'Chronic Conditions', data: user.chronic_conditions, pill: 'bg-orange-50 text-orange-600 border-orange-100' },
                                        { label: 'Current Medications', data: user.current_medications, pill: 'bg-blue-50 text-blue-600 border-blue-100' },
                                    ].map(({ label, data, pill }) => (
                                        <div key={label}>
                                            <p className="text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>{label}</p>
                                            <div className="flex flex-wrap gap-1">
                                                {data && data.length > 0 ? (
                                                    data.map((item, idx) => (
                                                        <span key={idx} className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${pill}`}>{item}</span>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] italic text-slate-300">None recorded</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Student Identification Toggle */}
                            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-light)' }}>
                                <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-md flex items-center justify-center bg-slate-100 text-slate-600"><Image size={11} /></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Student ID</span>
                                    </div>
                                    <div className="flex p-0.5 rounded-lg bg-slate-200/50">
                                        {(['front', 'back'] as const).map(side => (
                                            <button
                                                key={side}
                                                onClick={() => setIdSide(side)}
                                                className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${idSide === side ? 'bg-white shadow-sm text-accent' : 'text-slate-500 hover:text-slate-700'
                                                    }`}
                                            >
                                                {side}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <div className="relative group">
                                        <div
                                            onClick={() => {
                                                const url = idSide === 'front' ? user.id_front_url : user.id_back_url;
                                                if (url) setExpandedImg(url);
                                            }}
                                            className={`aspect-[2.4/1] rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all relative ${(idSide === 'front' ? user.id_front_url : user.id_back_url) ? 'cursor-zoom-in hover:border-accent' : 'border-slate-100 bg-slate-50/50'
                                                }`}
                                        >
                                            {idSide === 'front' ? (
                                                user.id_front_url ? (
                                                    <img src={user.id_front_url} alt="ID Front" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : <div className="flex flex-col items-center gap-2 opacity-20"><Image size={24} /><span className="text-[10px] font-bold uppercase">Front Missing</span></div>
                                            ) : (
                                                user.id_back_url ? (
                                                    <img src={user.id_back_url} alt="ID Back" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : <div className="flex flex-col items-center gap-2 opacity-20"><Image size={24} /><span className="text-[10px] font-bold uppercase">Back Missing</span></div>
                                            )}

                                            {(idSide === 'front' ? user.id_front_url : user.id_back_url) && (
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                    <div className="bg-white/90 p-2 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                                                        <Eye size={16} className="text-accent" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-center italic opacity-40 mt-3 leading-tight">Click to view high-resolution original.</p>
                                </div>
                            </div>
                        </div>

                        {/* ---- Columns 3–4: Tabbed Records ---- */}
                        <div className="xl:col-span-2 flex flex-col min-h-[480px]">
                            {/* Tab Bar */}
                            <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: 'var(--bg-wash)', border: '1px solid var(--border-light)' }}>
                                {tabs.map(t => (
                                    <button
                                        key={t.key}
                                        onClick={() => {
                                            setActiveTab(t.key);
                                            setCurrentPage(1);
                                        }}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                        style={{
                                            background: activeTab === t.key ? 'var(--card-bg)' : 'transparent',
                                            color: activeTab === t.key ? 'var(--accent)' : 'var(--text-muted)',
                                            boxShadow: activeTab === t.key ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
                                        }}
                                    >
                                        {t.icon}
                                        <span className="hidden sm:inline">{t.label}</span>
                                        {t.count > 0 && (
                                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black" style={{ background: activeTab === t.key ? 'var(--accent)' : 'var(--border-light)', color: activeTab === t.key ? 'white' : 'var(--text-muted)' }}>
                                                {t.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5 custom-scrollbar">

                                {/* VISIT HISTORY */}
                                {activeTab === 'visits' && (
                                    <>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinical Visits</span>
                                        </div>
                                        {loading ? (
                                            <div className="space-y-2.5">{[1, 2, 3].map(i => <SkeletonRow key={i} />)}</div>
                                        ) : records.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed" style={{ borderColor: 'var(--border-light)' }}>
                                                <Activity size={26} className="text-slate-200 mb-2" />
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">No visits logged yet</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-2.5">
                                                    {records.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((rec) => (
                                                        <VisitRecordRow
                                                            key={rec.id}
                                                            rec={rec}
                                                            fmtDate={fmtDate}
                                                            getVitals={getVitals}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="mt-4 flex justify-end">
                                                    <PaginationControl
                                                        currentPage={currentPage}
                                                        totalPages={Math.ceil(records.length / itemsPerPage) || 1}
                                                        onPageChange={setCurrentPage}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}

                                {/* APPOINTMENTS */}
                                {activeTab === 'appointments' && (
                                    loading ? (
                                        <div className="space-y-2.5">{[1, 2, 3].map(i => <SkeletonRow key={i} />)}</div>
                                    ) : userAppointments.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed" style={{ borderColor: 'var(--border-light)' }}>
                                            <Calendar size={26} className="text-slate-200 mb-2" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">No appointments found</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2.5">
                                                {userAppointments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((a: any) => (
                                                    <div key={a.id} className="rounded-xl border p-4 space-y-2 hover:shadow-sm transition-shadow" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-wash)' }}>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar size={11} className="text-slate-400" />
                                                                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                                                                    {a.appointment_sched ? fmtShort(a.appointment_sched) : fmtShort(a.request_timestamp)}
                                                                </span>
                                                            </div>
                                                            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${a.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                                a.status === 'REJECTED' || a.status === 'CANCELLED' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                                    'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                                }`}>{a.status || 'Scheduled'}</span>
                                                        </div>
                                                        <p className="text-xs font-medium italic pl-5 truncate" style={{ color: 'var(--text-secondary)' }}>"{a.visit_reason || 'No reason stated'}"</p>
                                                        <div className="flex items-center gap-3 text-[10px] pl-5 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                                                            {a.campus && <span className="truncate max-w-[100px]">📍 {a.campus}</span>}
                                                            {a.category && <span className="truncate max-w-[100px]">🩺 {a.category}</span>}
                                                            {a.nurse_assigned && <span className="truncate max-w-[120px]">👨‍⚕️ {a.nurse_assigned}</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-4 flex justify-end">
                                                <PaginationControl
                                                    currentPage={currentPage}
                                                    totalPages={Math.ceil(userAppointments.length / itemsPerPage) || 1}
                                                    onPageChange={setCurrentPage}
                                                />
                                            </div>
                                        </>
                                    )
                                )}

                                {/* MEDICAL REQUESTS */}
                                {activeTab === 'medical' && (
                                    loading ? (
                                        <div className="space-y-2.5">{[1, 2, 3].map(i => <SkeletonRow key={i} />)}</div>
                                    ) : (userCerts.length + userMeds.length) === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed" style={{ borderColor: 'var(--border-light)' }}>
                                            <FileText size={26} className="text-slate-200 mb-2" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">No medical requests found</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2.5">
                                                {[...userCerts, ...userMeds].sort((a, b) => new Date(b.requested_tst).getTime() - new Date(a.requested_tst).getTime()).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => {
                                                    if ('requested_tst' in item && 'request_reason' in item && !('medicine' in item)) {
                                                        const r = item as any;
                                                        return (
                                                            <div key={r.id} className="rounded-xl border p-4 space-y-2 hover:shadow-sm transition-shadow" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-wash)' }}>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">Medical Cert</span>
                                                                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${r.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                                        r.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                            'bg-red-50 text-red-600 border border-red-100'
                                                                        }`}>{r.status}</span>
                                                                </div>
                                                                <p className="text-xs font-medium italic" style={{ color: 'var(--text-secondary)' }}>"{r.request_reason || 'No reason stated'}"</p>
                                                                <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><Calendar size={10} /> {fmtShort(r.requested_tst)}</p>
                                                            </div>
                                                        );
                                                    } else {
                                                        const r = item as any;
                                                        return (
                                                            <div key={r.id} className="rounded-xl border p-4 space-y-2 hover:shadow-sm transition-shadow" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-wash)' }}>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 shrink-0">Medicine</span>
                                                                        <span className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }} title={r.medicine}>{r.medicine} × {r.medicine_qty}</span>
                                                                    </div>
                                                                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${r.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                                        r.status === 'DISPENSED' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                                            r.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                                'bg-red-50 text-red-600 border border-red-100'
                                                                        }`}>{r.status}</span>
                                                                </div>
                                                                <p className="text-xs font-medium italic truncate" style={{ color: 'var(--text-secondary)' }} title={r.request_reason}>"{r.request_reason || 'No reason stated'}"</p>
                                                                <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><Calendar size={10} /> {fmtShort(r.requested_tst)}</p>
                                                            </div>
                                                        );
                                                    }
                                                })}
                                            </div>
                                            <div className="mt-4 flex justify-end">
                                                <PaginationControl
                                                    currentPage={currentPage}
                                                    totalPages={Math.ceil((userCerts.length + userMeds.length) / itemsPerPage) || 1}
                                                    onPageChange={setCurrentPage}
                                                />
                                            </div>
                                        </>
                                    )
                                )}

                                {/* INQUIRIES */}
                                {activeTab === 'inquiries' && (
                                    loading ? (
                                        <div className="space-y-2.5">{[1, 2, 3].map(i => <SkeletonRow key={i} />)}</div>
                                    ) : userInquiries.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed" style={{ borderColor: 'var(--border-light)' }}>
                                            <MessageSquare size={26} className="text-slate-200 mb-2" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">No inquiries found</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2.5">
                                                {userInquiries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(i => (
                                                    <div key={i.id} className="rounded-xl border p-4 space-y-2 hover:shadow-sm transition-shadow" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-wash)' }}>
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <MessageSquare size={11} className="text-slate-400 shrink-0" />
                                                                <span className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{i.subject}</span>
                                                            </div>
                                                            <span className={`shrink-0 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${i.completed_timestamp ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                                                                }`}>{i.completed_timestamp ? 'Replied' : 'Pending'}</span>
                                                        </div>
                                                        <p className="text-xs font-medium italic pl-5 truncate" style={{ color: 'var(--text-secondary)' }} title={i.inquiry}>"{i.inquiry}"</p>
                                                        <p className="text-[10px] pl-5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><Calendar size={10} /> {fmtShort(i.inquiry_timestamp)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-4 flex justify-end">
                                                <PaginationControl
                                                    currentPage={currentPage}
                                                    totalPages={Math.ceil(userInquiries.length / itemsPerPage) || 1}
                                                    onPageChange={setCurrentPage}
                                                />
                                            </div>
                                        </>
                                    )
                                )}

                                {/* RUN LOGS */}
                                {activeTab === 'runs' && (
                                    loading ? (
                                        <div className="space-y-2.5">{[1, 2, 3].map(i => <SkeletonRow key={i} />)}</div>
                                    ) : userRunLogs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed" style={{ borderColor: 'var(--border-light)' }}>
                                            <Activity size={26} className="text-slate-200 mb-2" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">No run logs found</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2.5">
                                                {userRunLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(r => (
                                                    <div key={r.id} className="rounded-xl border p-4 space-y-2 hover:shadow-sm transition-shadow" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-wash)' }}>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <Activity size={11} className="text-slate-400 shrink-0" />
                                                                <span className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{r.distance_km.toFixed(2)} km</span>
                                                            </div>
                                                            <span className={`shrink-0 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100`}>
                                                                {r.duration_seconds < 60 ? `${r.duration_seconds}s` : `${Math.floor(r.duration_seconds / 60)}m ${r.duration_seconds % 60}s`}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-[10px] pl-5 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                                                            {r.calories_burned && <span>🔥 {r.calories_burned} kcal</span>}
                                                            {r.avg_pace && <span>⏱️ Pace: {r.avg_pace}</span>}
                                                        </div>
                                                        <p className="text-[10px] pl-5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><Calendar size={10} /> {fmtDate(r.created_at)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-4 flex justify-end">
                                                <PaginationControl
                                                    currentPage={currentPage}
                                                    totalPages={Math.ceil(userRunLogs.length / itemsPerPage) || 1}
                                                    onPageChange={setCurrentPage}
                                                />
                                            </div>
                                        </>
                                    )
                                )}

                                {/* NUTRITION / MEAL LOGS */}
                                {activeTab === 'nutrition' && (() => {
                                    const mealTypeStyle = (type: string | null) => {
                                        switch ((type || '').toLowerCase()) {
                                            case 'breakfast': return { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' };
                                            case 'lunch': return { badge: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-400' };
                                            case 'dinner': return { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-400' };
                                            case 'snack': return { badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-400' };
                                            default: return { badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
                                        }
                                    };
                                    return (
                                        userMealLogs.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed" style={{ borderColor: 'var(--border-light)' }}>
                                                <Utensils size={26} className="text-slate-200 mb-2" />
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">No meal logs found</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-2.5">
                                                    {userMealLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(m => {
                                                        const style = mealTypeStyle(m.meal_type);
                                                        return (
                                                            <div key={m.id} className="rounded-xl border p-4 space-y-2 hover:shadow-sm transition-shadow" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-wash)' }}>
                                                                {/* Header: Date + Meal Type + Calories */}
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Calendar size={11} className="text-slate-400" />
                                                                        <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{fmtShort(m.created_at)}</span>
                                                                        {m.meal_type && (
                                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${style.badge}`}>
                                                                                {m.meal_type}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{m.calories} <span className="text-[9px] font-bold text-slate-400 ml-0.5">kcal</span></span>
                                                                    </div>
                                                                </div>

                                                                {/* Main Food Info - Now as sibling rows to match appointment structure */}
                                                                <p className="text-xs font-bold truncate leading-tight pl-5" style={{ color: 'var(--text-primary)' }}>
                                                                    {m.food_name}
                                                                    {m.portion_size && <span className="font-medium text-slate-400 ml-1.5">({m.portion_size})</span>}
                                                                </p>

                                                                <div className="flex items-center justify-between gap-4 pl-5">
                                                                    <p className="text-[10px] font-medium italic truncate opacity-70 flex-1" style={{ color: 'var(--text-secondary)' }} title={m.health_summary ?? undefined}>
                                                                        {m.health_summary ? `"${m.health_summary}"` : 'No summary recorded'}
                                                                    </p>
                                                                    <div className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-tight shrink-0" style={{ color: 'var(--text-muted)' }}>
                                                                        {m.protein && <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-400" /> Prot: {m.protein}g</span>}
                                                                        {m.carbs && <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Carb: {m.carbs}g</span>}
                                                                        {m.fats && <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Fat: {m.fats}g</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="mt-4 flex justify-end">
                                                    <PaginationControl
                                                        currentPage={currentPage}
                                                        totalPages={Math.ceil(userMealLogs.length / itemsPerPage) || 1}
                                                        onPageChange={setCurrentPage}
                                                    />
                                                </div>
                                            </>
                                        )
                                    );
                                })()}

                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-8 py-3 border-t shrink-0 flex items-center justify-between" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-wash)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">PLV MedSync · Patient Index v2.1</p>
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">ID: {user.id?.substring(0, 12)}…</span>
                </div>
            </div>


            {/* Fullscreen Image View */}
            {expandedImg && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/90 cursor-zoom-out fade-in"
                    onClick={() => setExpandedImg(null)}
                >
                    <button
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                        onClick={() => setExpandedImg(null)}
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={expandedImg}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl scale-in"
                        alt="Expanded Patient Record"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
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
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--accent)' }}>Visit Date</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{fmtDate(rec.visit_date)}</p>
                </div>
                <div className="flex-1 min-w-[120px]">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Nurse</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{rec.nurse_assigned}</p>
                </div>
                <div className="flex-1 min-w-[120px]">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Diagnosis</p>
                    <p className="text-sm font-normal truncate" style={{ color: 'var(--text-secondary)' }} title={primaryDiagnosis}>{primaryDiagnosis}</p>
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
                                <p className="text-[11px] font-semibold uppercase tracking-tighter mb-0.5" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{item.val}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Diagnosis</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {Array.isArray(rec.diagnosis) ? rec.diagnosis.map((d, i) => (
                                    <span key={i} className="text-xs font-medium bg-red-50 text-red-700 px-2.5 py-1 rounded-lg border border-red-100">{d}</span>
                                )) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>N/A</span>}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Treatment Given</h4>
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
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Diagnostic Results</h4>
                                <ul className="list-disc list-inside text-xs space-y-1 ml-1" style={{ color: 'var(--text-secondary)' }}>
                                    {rec.diagnostic_results.map((res, i) => (
                                        <li key={i}>{res}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {rec.follow_up && (
                            <div className={!rec.diagnostic_results ? 'col-span-2' : ''}>
                                <h4 className="text-[11px] font-bold text-orange-500 uppercase tracking-widest mb-2">Follow-up Instructions</h4>
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



// ---- Visit Records Modal ----
function VisitRecordsModal({ user, onClose }: { user: SystemUser; onClose: () => void }) {
    const [records, setRecords] = useState<VisitRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 4;

    const loadRecords = async () => {
        setLoading(true);
        const data = await fetchVisitRecords(user.id);
        setRecords(data);
        setLoading(false);
    };

    useEffect(() => {
        loadRecords();
    }, [user.id]);


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
                            {records.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((rec) => (
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
                    <p className="text-[11px] font-medium italic" style={{ color: 'var(--text-muted)' }}>Showing {Math.min(records.length, itemsPerPage)} of {records.length} historical records</p>
                    <PaginationControl
                        currentPage={currentPage}
                        totalPages={Math.ceil(records.length / itemsPerPage) || 1}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </div>

        </div>
    );
}


// ---- Filter Modal ----
function FilterModal({
    isOpen,
    onClose,
    filters,
    onApply
}: {
    isOpen: boolean;
    onClose: () => void;
    filters: any;
    onApply: (f: any) => void;
}) {
    const [localFilters, setLocalFilters] = useState(filters);

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters, isOpen]);

    if (!isOpen) return null;

    const handleClear = () => {
        const cleared = {
            course: '',
            year_level: '',
            section: '',
            gender: '',
            age: '',
            birthdate_before: '',
            birthdate_after: '',
            blood_type: ''
        };
        setLocalFilters(cleared);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden fade-in" style={{ background: 'var(--card-bg)' }} onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600">
                            <Filter size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Advanced Filters</h2>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50" style={{ color: 'var(--text-muted)' }}>Refine Patient Search</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"><X size={20} /></button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--text-muted)' }}>Course</label>
                        <select
                            value={localFilters.course}
                            onChange={e => setLocalFilters({ ...localFilters, course: e.target.value })}
                            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border transition-all"
                            style={{ background: 'var(--bg-wash)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        >
                            <option value="">All Courses</option>
                            {courses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--text-muted)' }}>Year Level</label>
                        <select
                            value={localFilters.year_level}
                            onChange={e => setLocalFilters({ ...localFilters, year_level: e.target.value })}
                            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border transition-all"
                            style={{ background: 'var(--bg-wash)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        >
                            <option value="">All Years</option>
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                            <option value="5th Year">5th Year</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--text-muted)' }}>Section</label>
                        <input
                            type="text"
                            placeholder="e.g. A, B, 1"
                            value={localFilters.section}
                            onChange={e => setLocalFilters({ ...localFilters, section: e.target.value })}
                            className="w-full rounded-xl px-4 py-2 text-sm outline-none border transition-all caps"
                            style={{ background: 'var(--bg-wash)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--text-muted)' }}>Sex / Gender</label>
                        <select
                            value={localFilters.gender}
                            onChange={e => setLocalFilters({ ...localFilters, gender: e.target.value })}
                            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border transition-all"
                            style={{ background: 'var(--bg-wash)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        >
                            <option value="">Any</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--text-muted)' }}>Age</label>
                        <input
                            type="number"
                            placeholder="Exact age..."
                            value={localFilters.age}
                            onChange={e => setLocalFilters({ ...localFilters, age: e.target.value })}
                            className="w-full rounded-xl px-4 py-2 text-sm outline-none border transition-all"
                            style={{ background: 'var(--bg-wash)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--text-muted)' }}>Blood Type</label>
                        <select
                            value={localFilters.blood_type}
                            onChange={e => setLocalFilters({ ...localFilters, blood_type: e.target.value })}
                            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border transition-all"
                            style={{ background: 'var(--bg-wash)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        >
                            <option value="">Any</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--text-muted)' }}>Birthdate (After)</label>
                        <input
                            type="date"
                            value={localFilters.birthdate_after}
                            onChange={e => setLocalFilters({ ...localFilters, birthdate_after: e.target.value })}
                            className="w-full rounded-xl px-4 py-2 text-sm outline-none border transition-all"
                            style={{ background: 'var(--bg-wash)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--text-muted)' }}>Birthdate (Before)</label>
                        <input
                            type="date"
                            value={localFilters.birthdate_before}
                            onChange={e => setLocalFilters({ ...localFilters, birthdate_before: e.target.value })}
                            className="w-full rounded-xl px-4 py-2 text-sm outline-none border transition-all"
                            style={{ background: 'var(--bg-wash)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                    </div>
                </div>

                <div className="p-6 flex gap-3 border-t" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border)' }}>
                    <button
                        onClick={handleClear}
                        className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        Clear All
                    </button>
                    <button
                        onClick={() => onApply(localFilters)}
                        className="flex-[2] py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>
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

    // Filter States
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [activeFilters, setActiveFilters] = useState({
        course: '',
        year_level: '',
        section: '',
        gender: '',
        age: '',
        birthdate_before: '',
        birthdate_after: '',
        blood_type: ''
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filteredUsers = state.users.filter((u) => {
        const matchesSearch =
            u.fullName.toLowerCase().includes(search.toLowerCase()) ||
            u.studentId.includes(search);

        const matchesCourse = !activeFilters.course || u.course === activeFilters.course;
        const matchesYear = !activeFilters.year_level || u.year_level === activeFilters.year_level;
        const matchesSection = !activeFilters.section || (u.section || '').toLowerCase().includes(activeFilters.section.toLowerCase());
        const matchesGender = !activeFilters.gender || (u.gender || u.sex || '').toLowerCase() === activeFilters.gender.toLowerCase();
        const matchesBlood = !activeFilters.blood_type || u.blood_type === activeFilters.blood_type;
        const matchesAge = !activeFilters.age || calculateAge(u.birthdate).toString() === activeFilters.age.toString() || (u.age && u.age.toString() === activeFilters.age.toString());

        let matchesBirth = true;
        if (u.birthdate) {
            const b = new Date(u.birthdate);
            if (activeFilters.birthdate_after) {
                if (b < new Date(activeFilters.birthdate_after)) matchesBirth = false;
            }
            if (activeFilters.birthdate_before) {
                if (b > new Date(activeFilters.birthdate_before)) matchesBirth = false;
            }
        } else if (activeFilters.birthdate_after || activeFilters.birthdate_before) {
            matchesBirth = false;
        }

        return matchesSearch && matchesCourse && matchesYear && matchesSection && matchesGender && matchesBlood && matchesBirth && matchesAge;
    });

    // Dynamic Columns logic
    const baseColumns = ['#', 'Full Name', 'Student ID', 'Gender', 'Age', 'Blood Type'];
    const filterFieldMap: { [key: string]: { label: string, field: keyof SystemUser } } = {
        course: { label: 'Course', field: 'course' },
        year_level: { label: 'Year', field: 'year_level' },
        section: { label: 'Section', field: 'section' },
        age: { label: 'Age', field: 'age' },
        birthdate_before: { label: 'Birthdate', field: 'birthdate' },
        birthdate_after: { label: 'Birthdate', field: 'birthdate' }
    };

    // Which of our filters are actively used AND not already in base columns
    const dynamicFields = Object.entries(activeFilters)
        .filter(([key, val]) => val !== '' && filterFieldMap[key])
        .map(([key]) => key);

    // Deduplicate labels (e.g. birthdate_before and birthdate_after both map to 'Birthdate')
    const addedColumnKeys: string[] = [];
    const addedLabels: string[] = [];

    dynamicFields.forEach(key => {
        const info = filterFieldMap[key];
        if (!addedLabels.includes(info.label)) {
            addedLabels.push(info.label);
            addedColumnKeys.push(key);
        }
    });

    const activeAddedColumns = addedColumnKeys.slice(0, 3);
    const tableHeaders = [...baseColumns, ...activeAddedColumns.map(key => filterFieldMap[key].label), 'Action'];

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [search]);




    return (
        <div className="space-y-4">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Patient Records</h2>
                    <p className="text-sm mt-1 font-medium opacity-70" style={{ color: 'var(--text-secondary)' }}>Comprehensive medical overview of enrolled students.</p>
                </div>

            </div>

            {/* Filter Bar (Matching Inquiries Style) */}
            <div className="rounded-2xl p-4 flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-4 transition-colors" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="relative flex-1 min-w-full md:min-w-[280px] md:max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-faint)' }} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or Student ID..."
                        className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl outline-none font-normal transition-colors"
                        style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                </div>

                <button
                    onClick={() => setShowFilterModal(true)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all border ${Object.values(activeFilters).some(v => v !== '')
                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                >
                    <Filter size={15} />
                    {Object.values(activeFilters).some(v => v !== '') ? 'Filters Active' : 'Filter Records'}
                </button>

                <div className="flex-1" />

                <div className="flex items-center gap-2 border-l pl-3 ml-1" style={{ borderColor: 'var(--border)' }}>
                </div>
            </div>

            {/* Table Area */}
            <div className="rounded-2xl flex flex-col overflow-hidden shadow-sm" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', minHeight: '600px' }}>
                {/* Desktop Table View */}
                <div className="patient-table-wrapper flex-1 overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr style={{ background: 'var(--bg-wash)', borderBottom: '1px solid var(--border)' }}>
                                {tableHeaders.map((h) => (
                                    <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--text-muted)' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={tableHeaders.length} className="text-center text-sm py-10" style={{ color: 'var(--text-muted)' }}>No records found.</td>
                                </tr>
                            ) : (
                                paginatedUsers.map((user, idx) => (
                                    <tr key={user.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}>
                                        <td data-label="#" className="px-4 py-3 text-sm font-normal" style={{ color: 'var(--text-muted)' }}>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                                        <td data-label="Full Name" className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden"
                                                    style={{ background: '#2A66FF' }}
                                                >
                                                    {user.profile_picture_url ? (
                                                        <img
                                                            src={user.profile_picture_url}
                                                            alt={user.fullName}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        user.fullName.charAt(0)
                                                    )}
                                                </div>
                                                <span className="text-sm font-normal" style={{ color: 'var(--text-primary)' }}>{user.fullName}</span>
                                            </div>
                                        </td>
                                        <td data-label="Student ID" className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{user.studentId}</td>
                                        <td data-label="Sex" className="px-4 py-3">
                                            <span className="text-xs font-normal capitalize" style={{ color: 'var(--text-secondary)' }}>{user.sex || user.gender || '—'}</span>
                                        </td>
                                        <td data-label="Age" className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{user.age || calculateAge(user.birthdate)}</td>
                                        <td data-label="Blood Type" className="px-4 py-3">
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ color: 'var(--danger)', background: 'var(--danger-bg)', border: '1px solid rgba(226,92,92,0.15)' }}>
                                                {user.blood_type || '—'}
                                            </span>
                                        </td>
                                        {activeAddedColumns.map(key => {
                                            const field = filterFieldMap[key].field;
                                            const val = user[field];
                                            return (
                                                <td key={key} data-label={filterFieldMap[key].label} className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                    {Array.isArray(val) ? val.join(', ') : (val?.toString() || '—')}
                                                </td>
                                            );
                                        })}
                                        <td data-label="Actions" className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setViewHealth(user)}
                                                    title="View Details"
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                                    style={{ color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid rgba(72,187,238,0.15)' }}
                                                >
                                                    <Eye size={16} />
                                                </button>

                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Grid View */}
                <div className="patient-grid-mobile-always flex-1 overflow-y-auto">
                    <div className="p-3 space-y-3">
                        {paginatedUsers.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-sm">No records found.</div>
                        ) : (
                            paginatedUsers.map((user) => (
                                <div key={user.id} className="patient-card">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden shadow-sm" style={{ background: '#2A66FF' }}>
                                                {user.profile_picture_url ? (
                                                    <img src={user.profile_picture_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    user.fullName.charAt(0)
                                                )}
                                            </div>
                                            <div className="min-w-0 flex flex-col gap-1">
                                                {/* First Row: Name and Student Number */}
                                                <div className="flex items-baseline gap-2 min-w-0">
                                                    <h3 className="text-[13px] font-bold text-slate-800 truncate leading-tight">
                                                        {user.fullName}
                                                    </h3>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter shrink-0">
                                                        {user.studentId}
                                                    </p>
                                                </div>

                                                {/* Second Row: Course, Year, and Section */}
                                                <div className="flex flex-wrap gap-1">
                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-100 uppercase tracking-tighter">
                                                        {user.course || 'No Course'}
                                                    </span>
                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-100 uppercase tracking-tighter">
                                                        {user.year_level?.charAt(0) || '0'} - {user.section || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5 shrink-0">
                                            <button
                                                onClick={() => setViewHealth(user)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 bg-blue-50 border border-blue-100 active:scale-95 transition-transform"
                                            >
                                                <Eye size={14} />
                                            </button>

                                        </div>
                                    </div>

                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Pagination UI */}
                <div className="mt-auto px-6 py-4 flex items-center justify-end" style={{ background: 'var(--bg-wash)', borderTop: '1px solid var(--border)' }}>
                    <PaginationControl
                        currentPage={currentPage}
                        totalPages={Math.max(1, totalPages)}
                        onPageChange={setCurrentPage}
                    />
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

            <FilterModal
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                filters={activeFilters}
                onApply={(f) => {
                    setActiveFilters(f);
                    setShowFilterModal(false);
                    setCurrentPage(1);
                }}
            />
        </div>
    );
}
