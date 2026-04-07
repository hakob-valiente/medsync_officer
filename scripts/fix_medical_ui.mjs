import { readFileSync, writeFileSync } from 'fs';

const filePath = new URL('../src/pages/MedicalRequests.tsx', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
let src = readFileSync(filePath, 'utf8');

// ─── 1. CertProcessingModal: replace just the return JSX (open tag to end of function) ───
src = src.replace(
  /( {4}return \(\r?\n {8}<div className="fixed inset-0 z-\[60\] flex items-center justify-center p-4 modal-overlay" onClick=\{onClose\}>[\s\S]*?\r?\n {4}\);\r?\n\})\r?\n\r?\n\/\/ ---- Cert Preview Modal/,
  `    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-2xl shadow-2xl w-full max-w-lg fade-in overflow-hidden flex flex-col max-h-[90vh]"
                style={{ background: 'var(--card-bg)' }}
                onClick={(e) => e.stopPropagation()}>

                {/* Modal Header */}
                <div className="px-6 py-5 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-wash)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'var(--cta-gradient)', color: '#fff' }}>
                            <ClipboardList size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Process Certificate</h2>
                            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                Step {step} of 2 &bull; {step === 1 ? 'Medical Data' : 'Final Review'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-slate-200/50" style={{ color: 'var(--text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                    {step === 1 ? (
                        <div className="space-y-5">
                            {/* Section: Issuing Info */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-1 h-4 rounded-full bg-blue-500" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Issuing Information</h3>
                                </div>
                                <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider ml-0.5" style={{ color: 'var(--text-muted)' }}>Campus Location</label>
                                        <div className="relative">
                                            <select
                                                value={details.location}
                                                onChange={(e) => setDetails({ ...details, location: e.target.value })}
                                                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold outline-none appearance-none pr-10 border"
                                                style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                                            >
                                                {campuses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                {campuses.length === 0 && <option value="Maysan">Maysan</option>}
                                            </select>
                                            <ChevronDown size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider ml-0.5" style={{ color: 'var(--text-muted)' }}>Nurse / Health Officer</label>
                                        <input
                                            value={details.nurse_assigned}
                                            onChange={(e) => setDetails({ ...details, nurse_assigned: e.target.value })}
                                            placeholder="Enter full name of medical staff"
                                            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold outline-none border"
                                            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Clinical Evaluation */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-1 h-4 rounded-full bg-emerald-500" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Clinical Evaluation</h3>
                                </div>
                                <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider ml-0.5" style={{ color: 'var(--text-muted)' }}>Diagnosis</label>
                                        <input
                                            value={details.diagnosis}
                                            onChange={(e) => setDetails({ ...details, diagnosis: e.target.value })}
                                            placeholder="e.g. Acute Gastritis"
                                            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold outline-none border"
                                            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-wider ml-0.5" style={{ color: 'var(--text-muted)' }}>Rest From</label>
                                            <input
                                                type="date"
                                                value={details.excuse_start}
                                                onChange={(e) => setDetails({ ...details, excuse_start: e.target.value })}
                                                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold outline-none border"
                                                style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-wider ml-0.5" style={{ color: 'var(--text-muted)' }}>Rest Until</label>
                                            <input
                                                type="date"
                                                value={details.excuse_end}
                                                onChange={(e) => setDetails({ ...details, excuse_end: e.target.value })}
                                                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold outline-none border"
                                                style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                                <label className="text-[10px] font-bold uppercase tracking-wider ml-0.5" style={{ color: 'var(--text-muted)' }}>Certificate Body Preview</label>
                                <textarea
                                    value={details.custom_body}
                                    readOnly
                                    rows={8}
                                    className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none border resize-none opacity-80 leading-relaxed"
                                    style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)', color: 'var(--text-secondary)' }}
                                />
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50/60 border border-blue-100">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">Auto-generated from Step 1 clinical data</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-5 border-t flex gap-3 shrink-0" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                    {step === 2 && (
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 border"
                            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)', color: 'var(--text-secondary)' }}
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
                        className="btn-cta flex-[2] py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
                    >
                        {step === 1 ? 'Next: Review Body' : 'Generate PDF Preview'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---- Cert Preview Modal`
);

// ─── 2. ViewCertRequestModal: replace the entire modal return JSX ───
src = src.replace(
  /( {4}return \(\r?\n {8}<div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick=\{onClose\}>\r?\n {12}<div className="rounded-3xl shadow-2xl w-full max-w-2xl fade-in overflow-hidden" style=\{\{ background: 'var\(--card-bg\)' \}\} onClick=\{\(e\) => e\.stopPropagation\(\)\}>\r?\n {16}<div className="flex items-center justify-between p-6 border-b" style=\{\{ borderColor: 'var\(--border\)' \}\}>([\s\S]*?)\r?\n {4}\);\r?\n\}\r?\n\r?\n\/\/ ---- View Medicine/,
  `    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-2xl shadow-2xl w-full max-w-2xl fade-in overflow-hidden flex flex-col max-h-[90vh]"
                style={{ background: 'var(--card-bg)' }}
                onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-5 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-wash)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Certificate Request</h2>
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Ref #{request.id.substring(0, 10).toUpperCase()}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-slate-200/50" style={{ color: 'var(--text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                    {/* Requester Profile Card */}
                    <div className="rounded-xl border p-4 flex items-center gap-4" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                        <div className="w-14 h-14 rounded-xl bg-white border border-blue-100 flex items-center justify-center text-blue-400 shadow-sm shrink-0">
                            <User size={28} strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>{request.requester_name}</h4>
                            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-faint)' }}>{request.requester_student_number}</p>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    <Phone size={11} /> {request.contact_number}
                                </span>
                                <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    <Calendar size={11} /> {new Date(request.requested_tst).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border shrink-0 ${
                            request.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            request.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border-green-100' :
                            'bg-red-50 text-red-600 border-red-100'
                        }`}>{request.status}</span>
                    </div>

                    {/* Purpose */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-4 rounded-full bg-blue-400" />
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Purpose of Request</p>
                        </div>
                        <div className="rounded-xl border p-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)' }}>
                            <p className="text-[13px] font-medium leading-relaxed italic border-l-4 pl-3" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }}>
                                "{request.request_reason || 'No specific reason provided.'}"
                            </p>
                        </div>
                    </div>

                    {/* Supporting Document */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-4 rounded-full bg-slate-400" />
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Supporting Document</p>
                        </div>
                        {request.uploaded_id_img ? (
                            <div className="relative aspect-video rounded-xl overflow-hidden group shadow-sm ring-1" style={{ ['--tw-ring-color' as any]: 'var(--border-light)' }}>
                                <img src={request.uploaded_id_img} alt="Supporting ID" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <a href={request.uploaded_id_img} target="_blank" rel="noreferrer"
                                        className="px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest bg-white text-black shadow-lg hover:scale-105 active:scale-95 transition-all">
                                        View Full Image
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="aspect-video rounded-xl flex flex-col items-center justify-center border-2 border-dashed" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                                <Eye size={24} className="opacity-20 mb-2" style={{ color: 'var(--text-faint)' }} />
                                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>No Document Attached</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t flex gap-3 shrink-0" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                    {request.status === 'PENDING' ? (
                        <>
                            <button
                                onClick={() => onStatusChange('REJECTED')}
                                disabled={isSubmitting}
                                className="flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 border bg-red-50 text-red-600 hover:bg-red-100 border-red-100"
                            >
                                Decline Request
                            </button>
                            <button
                                onClick={() => onStatusChange('COMPLETED')}
                                disabled={isSubmitting}
                                className="btn-cta flex-[2] py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Check size={15} /> Approve & Process
                            </button>
                        </>
                    ) : (
                        <div className="w-full py-3.5 rounded-xl flex items-center justify-center border-2 border-dashed text-[11px] font-bold uppercase tracking-widest"
                            style={{ borderColor: 'var(--border-light)', color: request.status === 'COMPLETED' ? '#10b981' : '#ef4444' }}>
                            Locked &bull; Status: {request.status}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---- View Medicine`
);

// ─── 3. ViewMedicineRequestModal: replace the entire modal return JSX ───
src = src.replace(
  /( {4}return \(\r?\n {8}<div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick=\{onClose\}>\r?\n {12}<div className="rounded-3xl shadow-2xl w-full max-w-2xl fade-in overflow-hidden" style=\{\{ background: 'var\(--card-bg\)' \}\} onClick=\{\(e\) => e\.stopPropagation\(\)\}>\r?\n {16}<div className="flex items-center justify-between p-6 border-b" style=\{\{ borderColor: 'var\(--border\)' \}\}>([\s\S]*?)\r?\n {4}\);\r?\n\}\r?\n\r?\n\/\/ ---- Reject/,
  `    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-2xl shadow-2xl w-full max-w-2xl fade-in overflow-hidden flex flex-col max-h-[90vh]"
                style={{ background: 'var(--card-bg)' }}
                onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-5 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-wash)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <Package size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Medicine Request</h2>
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Ref #{request.id.substring(0, 10).toUpperCase()}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-slate-200/50" style={{ color: 'var(--text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                    {/* Requester Profile Card */}
                    <div className="rounded-xl border p-4 flex items-center gap-4" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                        <div className="w-14 h-14 rounded-xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-400 shadow-sm shrink-0">
                            <User size={28} strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>{request.requester_name}</h4>
                            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-faint)' }}>{request.requester_student_number}</p>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    <Phone size={11} /> {request.contact_number}
                                </span>
                                <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    <Calendar size={11} /> {new Date(request.requested_tst).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                        <span className={\'text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border shrink-0 \' + (
                            request.status === \'PENDING\' ? \'bg-amber-50 text-amber-600 border-amber-100\' :
                            request.status === \'ACCEPTED\' ? \'bg-emerald-50 text-emerald-600 border-emerald-100\' :
                            request.status === \'DISPENSED\' ? \'bg-blue-50 text-blue-600 border-blue-100\' :
                            \'bg-red-50 text-red-600 border-red-100\'
                        )}>{request.status}</span>
                    </div>

                    {/* Medicine Card */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-4 rounded-full bg-emerald-500" />
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Prescribed Medicine</p>
                        </div>
                        <div className="rounded-xl border p-4 flex items-center gap-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)' }}>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 shrink-0">
                                <Package size={22} />
                            </div>
                            <div>
                                <h4 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{request.medicine}</h4>
                                <p className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>Quantity: {request.medicine_qty} units &bull; Campus: {request.campus}</p>
                            </div>
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-4 rounded-full bg-slate-400" />
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Reason for Request</p>
                        </div>
                        <div className="rounded-xl border p-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)' }}>
                            <p className="text-[13px] font-medium leading-relaxed italic border-l-4 pl-3" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }}>
                                "{request.request_reason || 'No specific reason provided.'}"
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t flex gap-3 shrink-0" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border-light)' }}>
                    {request.status === 'PENDING' && (
                        <>
                            <button onClick={() => onStatusChange('REJECTED')} disabled={isSubmitting}
                                className="flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 border bg-red-50 text-red-600 hover:bg-red-100 border-red-100">
                                Decline
                            </button>
                            <button onClick={() => onStatusChange('ACCEPTED')} disabled={isSubmitting}
                                className="btn-cta flex-[2] py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95">
                                Approve Request
                            </button>
                        </>
                    )}
                    {request.status === 'ACCEPTED' && (
                        <>
                            <button onClick={() => onStatusChange('REJECTED')} disabled={isSubmitting}
                                className="flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 border bg-red-50 text-red-600 hover:bg-red-100 border-red-100">
                                Reject
                            </button>
                            <button onClick={() => onStatusChange('DISPENSED')} disabled={isSubmitting}
                                className="flex-[2] py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center gap-2">
                                <Package size={14} /> Mark as Dispensed
                            </button>
                        </>
                    )}
                    {(request.status === 'DISPENSED' || request.status === 'REJECTED') && (
                        <div className="w-full py-3.5 rounded-xl flex items-center justify-center border-2 border-dashed text-[11px] font-bold uppercase tracking-widest"
                            style={{ borderColor: 'var(--border-light)', color: request.status === 'DISPENSED' ? '#3b82f6' : '#ef4444' }}>
                            Locked &bull; Status: {request.status}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---- Reject`
);

writeFileSync(filePath, src, 'utf8');
console.log('✅ MedicalRequests.tsx UI updated successfully.');
