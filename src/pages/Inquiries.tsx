import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import { Search, Send, User, Mail, X, Filter, ChevronDown, ArrowUp, ArrowDown, Clock, Check, MessageSquare } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import {
    addLog,
    fetchInquiriesFromDB,
    updateInquiryStatusDB
} from '../store';
import { notifyIndividual } from '../lib/notifications';
import type { Inquiry } from '../types';

// ---- Reply Modal ----
function ReplyModal({
    inquiry,
    onClose,
    onSend,
    isSubmitting
}: {
    inquiry: Inquiry;
    onClose: () => void;
    onSend: (message: string) => void;
    isSubmitting: boolean;
}) {
    const [message, setMessage] = useState('');
    const email = inquiry.inquirer_email || 'N/A';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div
                className="rounded-2xl w-full max-w-lg fade-in overflow-hidden"
                style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-xl)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                        >
                            <Mail size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Reply to Inquiry</h2>
                            <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Inquiry ID: #{inquiry.id.substring(0, 8)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-100" style={{ color: 'var(--text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="rounded-xl p-4" style={{ background: 'var(--bg-wash)', border: '1px solid var(--border-light)' }}>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Original Inquiry</p>
                            <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{new Date(inquiry.inquiry_timestamp).toLocaleString()}</span>
                        </div>
                        <div className="mb-4 space-y-1 p-3 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                            <div className="flex justify-between">
                                <span className="text-[10px] font-medium" style={{ color: 'var(--text-faint)' }}>From Name:</span>
                                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{inquiry.inquirer_name || 'Anonymous'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[10px] font-medium" style={{ color: 'var(--text-faint)' }}>Student ID:</span>
                                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{inquiry.inquirer_student_number || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[10px] font-medium" style={{ color: 'var(--text-faint)' }}>Email:</span>
                                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{email}</span>
                            </div>
                        </div>
                        <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{inquiry.subject}</h4>
                        <p className="text-xs leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>"{inquiry.inquiry}"</p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Your Response</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your reply here..."
                            rows={5}
                            className="w-full rounded-xl px-5 py-4 text-sm font-medium outline-none transition-all resize-none"
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
                        onClick={() => onSend(message)}
                        disabled={!message.trim() || isSubmitting}
                        className="btn-cta flex-[2] py-3.5 rounded-xl text-sm font-semibold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40"
                    >
                        {isSubmitting ? 'Sending...' : 'Send Reply'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---- Detail Modal ----
function DetailModal({
    inquiry,
    onClose
}: {
    inquiry: Inquiry;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div
                className="rounded-2xl w-full max-w-lg fade-in overflow-hidden shadow-2xl"
                style={{ background: 'var(--card-bg)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Inquiry Detail</h2>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Subject: {inquiry.subject}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-8">
                    <div className="rounded-2xl p-6 bg-slate-50/50 border border-slate-100 italic leading-relaxed text-sm text-slate-600 shadow-inner">
                        "{inquiry.inquiry}"
                    </div>
                </div>
                <div className="p-6 bg-slate-50/80 border-t flex justify-end" style={{ borderColor: 'var(--border)' }}>
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-200 text-slate-600 hover:bg-slate-300 transition-all">Close View</button>
                </div>
            </div>
        </div>
    );
}

// ---- Main Inquiries Page ----
export default function Inquiries() {
    const { inquiries } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [dateFilter, setDateFilter] = useState('ALL');
    const [viewInquiry, setViewInquiry] = useState<Inquiry | null>(null);
    const [expandInquiry, setExpandInquiry] = useState<Inquiry | null>(null);
    const [successToast, setSuccessToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [inquirySortOrder, setInquirySortOrder] = useState<'ASC' | 'DESC'>('DESC');
    const itemsPerPage = 8;

    useEffect(() => {
        fetchInquiriesFromDB();
    }, []);

    const location = useLocation();

    useEffect(() => {
        if (location.state?.viewId) {
            const inquiry = inquiries.find(i => i.id === location.state.viewId);
            if (inquiry) {
                setViewInquiry(inquiry);
            }
            window.history.replaceState({}, document.title);
        }
    }, [location.state, inquiries]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, dateFilter, statusFilter]);

    const filteredInquiries = useMemo(() => {
        const filtered = inquiries.filter(req => {
            const matchesSearch =
                req.inquirer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                req.inquirer_student_number?.includes(searchTerm) ||
                req.subject?.toLowerCase().includes(searchTerm.toLowerCase());

            let matchesDate = true;
            const now = Date.now();
            const inquiryDate = new Date(req.inquiry_timestamp).getTime();
            const diffHours = (now - inquiryDate) / (1000 * 60 * 60);

            if (dateFilter === '24h') matchesDate = diffHours <= 24;
            else if (dateFilter === '7d') matchesDate = diffHours <= 24 * 7;
            else if (dateFilter === '30d') matchesDate = diffHours <= 24 * 30;

            const matchesStatus = statusFilter === 'ALL' ||
                (statusFilter === 'COMPLETED' ? !!req.completed_timestamp : !req.completed_timestamp);

            return matchesSearch && matchesDate && matchesStatus;
        });

        return [...filtered].sort((a, b) => {
            const dateA = new Date(a.inquiry_timestamp).getTime();
            const dateB = new Date(b.inquiry_timestamp).getTime();
            return inquirySortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
        });
    }, [inquiries, searchTerm, dateFilter, statusFilter, inquirySortOrder]);

    const totalPages = Math.ceil(filteredInquiries.length / itemsPerPage);
    const paginatedInquiries = filteredInquiries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleSendReply = async (message: string) => {
        if (!viewInquiry) return;
        setIsSubmitting(true);
        try {
            const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
            const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
            const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

            if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
                throw new Error('Missing EmailJS configuration in .env');
            }

            const templateParams = {
                to_email: viewInquiry.inquirer_email,
                to_name: viewInquiry.inquirer_name,
                subject: `Reply to ${viewInquiry.subject}`,
                message: message,
                admin_name: 'PLV MedSync Admin'
            };

            const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);

            if (response.status !== 200) {
                throw new Error(`EmailJS delivery failed`);
            }

            await updateInquiryStatusDB(viewInquiry.id);
            await addLog('Admin', `Replied to inquiry ${viewInquiry.id} from ${viewInquiry.inquirer_name}`);

            await notifyIndividual(
                viewInquiry.inquirer_id,
                'Admin Replied to Inquiry',
                message,
                'inquiry_reply',
                viewInquiry.id
            );

            setViewInquiry(null);
            setSuccessToast({ show: true, message: 'Reply sent successfully!' });
            setTimeout(() => setSuccessToast({ show: false, message: '' }), 3000);
        } catch (e: any) {
            alert(e.message || 'Action failed.');
            console.error('Email Dispatch Error:', e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Student Inquiries</h2>
                    <p className="text-sm mt-1 font-medium opacity-70" style={{ color: 'var(--text-secondary)' }}>Read and respond to general student concerns and questions.</p>
                </div>
            </div>

            {/* Filter Section */}
            <div className="rounded-2xl p-4 flex flex-wrap items-center gap-4 transition-colors mb-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="relative flex-1 min-w-[280px] max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-faint)' }} />
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search student name, ID, or subject..."
                        className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl outline-none font-normal transition-colors"
                        style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative min-w-[160px]">
                        <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-faint)' }} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="appearance-none w-full pl-10 pr-10 py-2.5 text-xs font-semibold rounded-xl outline-none transition-colors shadow-sm"
                            style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        >
                            <option value="PENDING">Pending Reply</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="ALL">All Status</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" style={{ color: 'var(--text-faint)' }} />
                    </div>

                    <div className="relative min-w-[160px]">
                        <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-faint)' }} />
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="appearance-none w-full pl-10 pr-10 py-2.5 text-xs font-semibold rounded-xl outline-none transition-colors shadow-sm"
                            style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        >
                            <option value="ALL">All Time</option>
                            <option value="24h">Last 24 Hours</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" style={{ color: 'var(--text-faint)' }} />
                    </div>
                </div>
            </div>

            {/* Inquiries Table */}
            <div className="rounded-xl overflow-hidden flex flex-col min-h-[500px]" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full">
                    <thead>
                        <tr style={{ background: 'var(--bg-wash)', borderBottom: '1px solid var(--border)' }}>
                            <th className="text-left text-[10px] font-bold uppercase tracking-widest px-6 py-4" style={{ color: 'var(--text-muted)' }}>Inquirer</th>
                            <th className="text-left text-[10px] font-bold uppercase tracking-widest px-6 py-4" style={{ color: 'var(--text-muted)' }}>Subject</th>
                            <th className="text-left text-[10px] font-bold uppercase tracking-widest px-6 py-4" style={{ color: 'var(--text-muted)' }}>Inquiry Detail</th>
                            <th className="text-left text-[10px] font-bold uppercase tracking-widest px-6 py-4" style={{ color: 'var(--text-muted)' }}>Contact Info</th>
                            <th
                                className="text-left text-[10px] font-bold uppercase tracking-widest px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                                style={{ color: 'var(--text-muted)' }}
                                onClick={() => setInquirySortOrder(p => p === 'ASC' ? 'DESC' : 'ASC')}
                            >
                                <div className="flex items-center gap-2">
                                    Submitted
                                    {inquirySortOrder === 'ASC' ? <ArrowUp size={12} className="text-blue-500" /> : <ArrowDown size={12} className="text-blue-500" />}
                                </div>
                            </th>
                            <th className="text-left text-[10px] font-bold uppercase tracking-widest px-6 py-4" style={{ color: 'var(--text-muted)' }}>Status</th>
                            <th className="text-left text-[10px] font-bold uppercase tracking-widest px-6 py-4 text-right" style={{ color: 'var(--text-muted)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedInquiries.length === 0 ? (
                            <tr><td colSpan={7} className="py-20 text-center font-medium" style={{ color: 'var(--text-faint)' }}>No inquiries found</td></tr>
                        ) : (
                            paginatedInquiries.map(req => (
                                <tr key={req.id} className="transition-colors group text-sm" style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                                                style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid rgba(59,172,237,0.1)' }}
                                            >
                                                <User size={16} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{req.inquirer_name}</span>
                                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{req.inquirer_student_number}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                                        {req.subject}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium truncate max-w-[150px] italic text-xs" style={{ color: 'var(--text-secondary)' }}>"{req.inquiry}"</p>
                                            <button 
                                                onClick={() => setExpandInquiry(req)}
                                                className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all opacity-0 group-hover:opacity-100"
                                                title="Expand Details"
                                            >
                                                <ChevronDown size={12} className="-rotate-90" />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
                                                <Mail size={12} className="opacity-40" />
                                                <span className="text-[11px] truncate max-w-[150px]">{req.inquirer_email || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {(() => {
                                                const now = Date.now();
                                                const inquiryDate = new Date(req.inquiry_timestamp).getTime();
                                                const isNew = (now - inquiryDate) < (24 * 60 * 60 * 1000);
                                                return isNew ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-600 border border-red-200 animate-pulse w-fit">
                                                        NEW SUBMITTED
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-medium text-slate-500">
                                                        {new Date(req.inquiry_timestamp).toLocaleDateString()}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {req.completed_timestamp ? (
                                            <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                Replied
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
                                                PENDING
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setViewInquiry(req)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ml-auto active:scale-95"
                                            style={{ color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid rgba(59,172,237,0.15)' }}
                                        >
                                            <Send size={14} />
                                            Reply
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                </div>
                {/* Pagination */}
                <div className="px-6 py-4 flex items-center justify-between mt-auto" style={{ background: 'var(--bg-wash)', borderTop: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-4 ml-auto">
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                            Page {currentPage} of {Math.max(1, totalPages)}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
                                style={{ background: 'var(--card-bg)', color: 'var(--text-secondary)' }}
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
                                style={{ background: 'var(--card-bg)', color: 'var(--text-secondary)' }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {expandInquiry && (
                <DetailModal 
                    inquiry={expandInquiry}
                    onClose={() => setExpandInquiry(null)}
                />
            )}

            {viewInquiry && (
                <ReplyModal
                    inquiry={viewInquiry}
                    onClose={() => setViewInquiry(null)}
                    onSend={handleSendReply}
                    isSubmitting={isSubmitting}
                />
            )}

            {successToast.show && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
                    <div className="bg-white rounded-2xl shadow-2xl px-6 py-3 border border-emerald-100 flex items-center gap-3 animate-bounce-subtle">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <Check size={18} strokeWidth={3} />
                        </div>
                        <span className="text-sm font-bold text-slate-800">{successToast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
