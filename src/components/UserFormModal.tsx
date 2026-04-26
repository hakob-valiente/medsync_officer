import { useState } from 'react';
import { X, User, Hash, GraduationCap, MapPin, Droplets, Info, ChevronDown } from 'lucide-react';

const PLV_COURSES = [
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

const BARANGAYS = [
    "Arkong Bato", "Bagbaguin", "Balangkas", "Bignay", "Bisig",
    "Canumay East", "Canumay West", "Coloong", "Dalandanan",
    "Gen. T. de Leon", "Isla", "Karuhatan", "Lawang Bato",
    "Lingunan", "Mabolo", "Malanday", "Malinta", "Mapulang Lupa",
    "Marulas", "Maysan", "Palasan", "Pariancillo Villa", "Pasolo",
    "Paso de Blas", "Poblacion", "Pulo", "Punturin", "Rincon",
    "Tagalag", "Ugong", "Viente Reales", "Wawang Pulo"
];

const SECTIONS = Array.from({ length: 15 }, (_, i) => (i + 1).toString());

export function UserFormModal({ user, onClose, onSave, isSubmitting }: {
    user?: any;
    onClose: () => void;
    onSave: (data: any) => void;
    isSubmitting: boolean;
}) {
    const [form, setForm] = useState({
        first_name: user?.first_name || '',
        middle_name: user?.middle_name || '',
        last_name: user?.last_name || '',
        suffix: user?.suffix || '',
        student_number: user?.student_number || '',
        email: user?.email || '',
        gender: user?.gender || user?.sex || 'Male',
        birthdate: user?.birthdate || '',
        course: user?.course || '',
        year_level: user?.year_level || '1st Year',
        section: user?.section || '1',
        barangay: user?.barangay || '',
        height_cm: user?.height_cm || '',
        weight_kg: user?.weight_kg || '',
        blood_type: user?.blood_type || 'A+',
        allergies: Array.isArray(user?.allergies) ? user.allergies.join(', ') : (user?.allergies || ''),
        chronic_conditions: Array.isArray(user?.chronic_conditions) ? user.chronic_conditions.join(', ') : (user?.chronic_conditions || ''),
        current_medications: Array.isArray(user?.current_medications) ? user.current_medications.join(', ') : (user?.current_medications || ''),
        ispwd: user?.ispwd || false,
        contact_person: user?.contact_person || '',
        contact_number: user?.contact_number || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Convert comma-separated strings back to arrays
        const processedForm = {
            ...form,
            allergies: form.allergies.split(',').map((s: string) => s.trim()).filter(Boolean),
            chronic_conditions: form.chronic_conditions.split(',').map((s: string) => s.trim()).filter(Boolean),
            current_medications: form.current_medications.split(',').map((s: string) => s.trim()).filter(Boolean),
            // Ensure numeric fields are numbers
            height_cm: parseFloat(form.height_cm as string) || null,
            weight_kg: parseFloat(form.weight_kg as string) || null,
        };

        onSave(processedForm);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden fade-in flex flex-col" style={{ background: 'var(--card-bg)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'var(--accent)', color: 'white' }}>
                            <User size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{user ? 'Edit Patient Record' : 'Register New Patient'}</h2>
                            <p className="text-[11px] uppercase font-bold tracking-widest opacity-60 mt-0.5" style={{ color: 'var(--text-muted)' }}>Medical Database Entry</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl transition-colors hover:bg-black/5" style={{ color: 'var(--text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
                    
                    {/* Personal Information */}
                    <div className="p-5 rounded-xl border shadow-sm" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-1.5 h-4 rounded-full" style={{ background: 'var(--accent)' }}></div>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Personal Profile</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>First Name</label>
                                <input required value={form.first_name} onChange={(e) => setForm(p => ({ ...p, first_name: e.target.value }))} className="w-full bg-white rounded-lg px-3.5 py-2.5 text-xs font-semibold outline-none border focus:border-blue-400 transition-colors shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Middle Name</label>
                                <input value={form.middle_name} onChange={(e) => setForm(p => ({ ...p, middle_name: e.target.value }))} className="w-full bg-white rounded-lg px-3.5 py-2.5 text-xs font-semibold outline-none border focus:border-blue-400 transition-colors shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Last Name</label>
                                <input required value={form.last_name} onChange={(e) => setForm(p => ({ ...p, last_name: e.target.value }))} className="w-full bg-white rounded-lg px-3.5 py-2.5 text-xs font-semibold outline-none border focus:border-blue-400 transition-colors shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Suffix</label>
                                <input placeholder="e.g. Jr., III" value={form.suffix} onChange={(e) => setForm(p => ({ ...p, suffix: e.target.value }))} className="w-full bg-white rounded-lg px-3.5 py-2.5 text-xs font-semibold outline-none border focus:border-blue-400 transition-colors shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Student Number</label>
                                <div className="relative">
                                    <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-muted)' }} />
                                    <input required placeholder="XX-XXXX" value={form.student_number} onChange={(e) => setForm(p => ({ ...p, student_number: e.target.value }))} className="w-full bg-white rounded-lg pl-9 pr-3.5 py-2.5 text-xs font-semibold outline-none border focus:border-blue-400 transition-colors shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Email Address</label>
                                <input required type="email" placeholder="student@plv.edu.ph" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} className="w-full bg-white rounded-lg px-3.5 py-2.5 text-xs font-semibold outline-none border focus:border-blue-400 transition-colors shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Birthdate</label>
                                <input required type="date" value={form.birthdate} onChange={(e) => setForm(p => ({ ...p, birthdate: e.target.value }))} className="w-full bg-white rounded-lg px-3.5 py-2.5 text-xs font-semibold outline-none border focus:border-blue-400 transition-colors shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Sex</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Male', 'Female'].map(s => (
                                        <button key={s} type="button" onClick={() => setForm(p => ({ ...p, gender: s }))} className="py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border shadow-sm transition-all"
                                            style={{ 
                                                background: form.gender === s ? 'var(--accent)' : 'white', 
                                                borderColor: form.gender === s ? 'var(--accent)' : 'var(--border)', 
                                                color: form.gender === s ? 'white' : 'var(--text-secondary)'
                                            }}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Academic Information */}
                    <div className="p-5 rounded-xl border shadow-sm" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-1.5 h-4 rounded-full" style={{ background: 'var(--warning)' }}></div>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Academic Classification</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Course</label>
                                <div className="relative">
                                    <GraduationCap size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-muted)' }} />
                                    <select required value={form.course} onChange={(e) => setForm(p => ({ ...p, course: e.target.value }))} className="w-full appearance-none bg-white rounded-lg pl-9 pr-9 py-2.5 text-xs font-semibold outline-none border focus:border-blue-400 shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                                        <option value="">Select Course</option>
                                        {PLV_COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-muted)' }} />
                                </div>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Year Level</label>
                                <div className="relative">
                                    <select required value={form.year_level} onChange={(e) => setForm(p => ({ ...p, year_level: e.target.value }))} className="w-full appearance-none bg-white rounded-lg px-3.5 py-2.5 pr-9 text-xs font-semibold outline-none border focus:border-blue-400 shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                                        {["1st Year", "2nd Year", "3rd Year", "4th Year"].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-muted)' }} />
                                </div>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Section</label>
                                <div className="relative">
                                    <select required value={form.section} onChange={(e) => setForm(p => ({ ...p, section: e.target.value }))} className="w-full appearance-none bg-white rounded-lg px-3.5 py-2.5 pr-9 text-xs font-semibold outline-none border focus:border-blue-400 shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                                        {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-muted)' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Medical & Health Data */}
                    <div className="p-5 rounded-xl border shadow-sm" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-1.5 h-4 rounded-full" style={{ background: 'var(--danger)' }}></div>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Medical & Health Data</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Blood Type</label>
                                <div className="relative">
                                    <Droplets size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" />
                                    <select value={form.blood_type} onChange={(e) => setForm(p => ({ ...p, blood_type: e.target.value }))} className="w-full appearance-none bg-white rounded-lg pl-9 pr-9 py-2.5 text-xs font-semibold outline-none border focus:border-blue-400 shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bt => <option key={bt} value={bt}>{bt}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-muted)' }} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Height (cm)</label>
                                <input type="number" step="0.1" value={form.height_cm} onChange={(e) => setForm(p => ({ ...p, height_cm: e.target.value }))} className="w-full bg-white rounded-lg px-3.5 py-2.5 text-xs font-semibold outline-none border focus:border-blue-400 shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Weight (kg)</label>
                                <input type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm(p => ({ ...p, weight_kg: e.target.value }))} className="w-full bg-white rounded-lg px-3.5 py-2.5 text-xs font-semibold outline-none border focus:border-blue-400 shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                            </div>
                            <div className="flex flex-col justify-end">
                                <label className="flex items-center justify-center gap-2 cursor-pointer py-2.5 bg-white rounded-lg border shadow-sm hover:bg-slate-50 transition-all" style={{ borderColor: 'var(--border)' }}>
                                    <input type="checkbox" checked={form.ispwd} onChange={(e) => setForm(p => ({ ...p, ispwd: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Disable/PWD</span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-4 pt-1">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 flex justify-between" style={{ color: 'var(--text-muted)' }}>
                                    <span>Allergies</span>
                                    <span className="opacity-50">(Comma separated)</span>
                                </label>
                                <input value={form.allergies} onChange={(e) => setForm(p => ({ ...p, allergies: e.target.value }))} placeholder="e.g. Penicillin, Seafood, Peanuts" className="w-full bg-white rounded-lg px-3.5 py-2.5 text-xs font-semibold outline-none border focus:border-blue-400 shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Chronic Conditions</label>
                                    <input value={form.chronic_conditions} onChange={(e) => setForm(p => ({ ...p, chronic_conditions: e.target.value }))} placeholder="e.g. Asthma, Diabetes" className="w-full bg-white rounded-lg px-3.5 py-2.5 text-xs font-semibold outline-none border focus:border-blue-400 shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Current Medications</label>
                                    <input value={form.current_medications} onChange={(e) => setForm(p => ({ ...p, current_medications: e.target.value }))} placeholder="e.g. Salbutamol" className="w-full bg-white rounded-lg px-3.5 py-2.5 text-xs font-semibold outline-none border focus:border-blue-400 shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Residence & Emergency */}
                    <div className="p-5 rounded-xl border shadow-sm" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-1.5 h-4 rounded-full" style={{ background: 'var(--success)' }}></div>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Emergency & Location</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Barangay (Valenzuela)</label>
                                <div className="relative">
                                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-muted)' }} />
                                    <select required value={form.barangay} onChange={(e) => setForm(p => ({ ...p, barangay: e.target.value }))} className="w-full appearance-none bg-white rounded-lg pl-9 pr-9 py-2.5 text-xs font-semibold outline-none border focus:border-blue-400 shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                                        <option value="">Select Barangay</option>
                                        {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-muted)' }} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Contact Person</label>
                                <input required value={form.contact_person} onChange={(e) => setForm(p => ({ ...p, contact_person: e.target.value }))} className="w-full bg-white rounded-lg px-3.5 py-2.5 text-xs font-semibold outline-none border focus:border-blue-400 shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Contact Number</label>
                                <input required value={form.contact_number} onChange={(e) => setForm(p => ({ ...p, contact_number: e.target.value }))} className="w-full bg-white rounded-lg px-3.5 py-2.5 text-xs font-semibold outline-none border focus:border-blue-400 shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-5 border-t shrink-0 flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                    <div className="flex items-center gap-2">
                        <Info size={14} style={{ color: 'var(--text-muted)' }} />
                        <p className="text-[11px] font-bold uppercase tracking-widest hidden md:block" style={{ color: 'var(--text-muted)' }}>Secure Medical Record Entry</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-lg border text-[11px] font-bold uppercase tracking-wider shadow-sm transition-all hover:bg-black/5" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                            Cancel
                        </button>
                        <button type="submit" onClick={handleSubmit} disabled={isSubmitting} className="flex-1 md:flex-none px-8 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest shadow-md transition-all active:scale-95 disabled:opacity-40" style={{ background: 'var(--accent)', color: 'white' }}>
                            {isSubmitting ? 'Syncing...' : user ? 'Update Record' : 'Register Patient'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
