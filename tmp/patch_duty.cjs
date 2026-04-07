const fs = require('fs');
let code = fs.readFileSync('src/pages/Duty.tsx', 'utf8');

const regex = /\/\/ ---- Assign Confirm Modal ----[\s\S]*?\/\/ ---- Main Duty Page ----/;

const replacement = `// ---- Assign Confirm Modal ----
function AssignModal({ user, onConfirm, onClose }: {
    user: SystemUser;
    onConfirm: (campus: string, clinic: string, perms: string[], start: string, end: string) => void;
    onClose: () => void
}) {
    const state = useStore();
    const availableCampuses = state.campuses || [];
    
    const [campus, setCampus] = useState<string>(availableCampuses[0]?.id || '');
    const [clinic, setClinic] = useState<string>('');
    const [perms, setPerms] = useState<string[]>([]);
    const [dutyStart, setDutyStart] = useState('07:00');
    const [dutyEnd, setDutyEnd] = useState('17:00');

    // Update clinic options when campus changes
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md fade-in" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="font-bold text-slate-800">Assign as Officer</h2>
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                {new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400">{user.fullName} · {user.studentId}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Duty Hours */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Duty Start</label>
                            <input
                                type="time"
                                value={dutyStart}
                                onChange={(e) => setDutyStart(e.target.value)}
                                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                                style={{ border: '1.5px solid var(--border)', background: 'var(--bg)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Duty End</label>
                            <input
                                type="time"
                                value={dutyEnd}
                                onChange={(e) => setDutyEnd(e.target.value)}
                                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                                style={{ border: '1.5px solid var(--border)', background: 'var(--bg)' }}
                            />
                        </div>
                    </div>

                    {/* Campus Area */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Assign to Campus</label>
                            <div className="relative">
                                <select
                                    value={campus}
                                    onChange={(e) => setCampus(e.target.value)}
                                    className="w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-sm outline-none"
                                    style={{ border: '1.5px solid var(--border)', background: 'var(--bg)' }}
                                >
                                    {availableCampuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    {availableCampuses.length === 0 && <option value="">No Campuses</option>}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Assign to Clinic</label>
                            <div className="relative">
                                <select
                                    value={clinic}
                                    onChange={(e) => setClinic(e.target.value)}
                                    disabled={!campus}
                                    className="w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-sm outline-none disabled:opacity-50"
                                    style={{ border: '1.5px solid var(--border)', background: 'var(--bg)' }}
                                >
                                    {(state.clinics || []).filter(c => c.campusId === campus).map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                    {(state.clinics || []).filter(c => c.campusId === campus).length === 0 && (
                                        <option value="">No Clinics</option>
                                    )}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Permissions Area */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-semibold text-slate-700">Module Permissions</label>
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); setPerms(perms.length === 3 ? [] : ['document', 'inventory', 'patient']); }}
                                className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wider hover:bg-blue-100 transition-colors"
                            >
                                {perms.length === 3 ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="space-y-3">
                            {['document', 'inventory', 'patient'].map((key) => (
                                <label
                                    key={key}
                                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-slate-50"
                                    style={{ border: '1px solid var(--border)' }}
                                    onClick={(e) => { e.preventDefault(); togglePerm(key); }}
                                >
                                    <div
                                        className={\`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors cursor-pointer \${perms.includes(key)
                                            ? 'border-blue-500 bg-blue-500'
                                            : 'border-slate-300 bg-white'
                                            }\`}
                                    >
                                        {perms.includes(key) && <Check size={12} color="white" strokeWidth={3} />}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 capitalize">
                                        {key === 'document' ? 'Document Management' : key === 'inventory' ? 'Inventory Management' : 'Patient Records'}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 px-5 pb-5">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-slate-600 hover:bg-slate-50" style={{ borderColor: 'var(--border)' }}>
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(campus, clinic, perms, dutyStart, dutyEnd)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ background: 'var(--accent)' }}
                    >
                        Confirm Assignment
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---- Main Duty Page ----`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/Duty.tsx', code);
