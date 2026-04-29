import { useState, useEffect, useMemo } from 'react';
import {
    Plus, Search, ChevronDown, Package, Pill, Box,
    Edit, Trash2, AlertCircle, Eye,
    LayoutGrid, List, Activity, Upload, Clock,
    X, Check, Camera, History
} from 'lucide-react';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { QRScannerModal } from '../components/ui/QRScannerModal';
import { useStore } from '../hooks/useStore';
import {
    addLog,
    fetchInventoryFromDB,
    addInventoryDB,
    updateInventoryDB,
    deleteInventoryDB,
    bulkInsertInventoryDB,
    fetchMedicineRequestsFromDB,
    updateMedicineRequestStatusDB,
    deleteMedicineRequestDB,
    updateMedicineRequestDB,
    genId
} from '../store';
import { notifyIndividual, type NotificationType } from '../lib/notifications';
import { ViewMedicineRequestModal, RejectReasonModal, NewMedRequestModal } from './MedicalRequests';
import type { InventoryItem, MedicineRequest, CampusRecord } from '../types';
import { PaginationControl } from '../components/ui/PaginationControl';
import Papa from 'papaparse';

// --- Constants ---
const CATEGORIES = ['Medicine', 'Supplies', 'Equipment', 'First Aid', 'Other'];
const UNITS = ['By pieces', 'By boxes', 'By packs', 'By pairs', 'In ml'];

// ---- Inventory Form Modal ----
function InventoryFormModal({
    item,
    onClose,
    onSave,
    isSubmitting
}: {
    item?: InventoryItem | null;
    onClose: () => void;
    onSave: (data: Partial<InventoryItem>) => void;
    isSubmitting: boolean;
}) {
    const { campuses } = useStore();
    const [form, setForm] = useState<Partial<InventoryItem>>({
        item_name: item?.item_name || '',
        asset_type: item?.asset_type || 'Medicine',
        status: item?.status || 'Available',
        quantity: item?.quantity || 0,
        expiry_date: item?.expiry_date || '',
        unit_measure: item?.unit_measure || 'By pieces',
        campus: item?.campus || (campuses.length > 0 ? campuses[0].name : 'Main')
    });

    const isExpired = form.expiry_date && new Date(form.expiry_date) <= new Date();
    const valid = form.item_name?.trim() && (form.quantity !== undefined && form.quantity >= 0) && form.campus;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-[var(--radius-2xl)] shadow-[var(--shadow-2xl)] w-full max-w-lg fade-in overflow-hidden" style={{ background: 'var(--card-bg)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                            <Package size={20} strokeWidth={2.2} />
                        </div>
                        <div>
                            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item ? 'Edit Inventory' : 'Add New Item'}</h2>
                            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Asset Management</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ color: 'var(--text-muted)' }} onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-wash)'; e.currentTarget.style.color = 'var(--text-primary)'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                        <X size={18} strokeWidth={2.2} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-2">
                            <label className="form-label">Item Name</label>
                            <input
                                value={form.item_name}
                                onChange={(e) => setForm(p => ({ ...p, item_name: e.target.value }))}
                                placeholder="e.g. Paracetamol 500mg"
                                className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all"
                                style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label className="form-label">Type</label>
                            <div className="relative">
                                <select
                                    value={form.asset_type}
                                    onChange={(e) => setForm(p => ({ ...p, asset_type: e.target.value }))}
                                    className="w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm font-medium outline-none transition-all"
                                    style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Campus</label>
                            <div className="relative">
                                <select
                                    value={form.campus}
                                    onChange={(e) => setForm(p => ({ ...p, campus: e.target.value }))}
                                    className="w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm font-medium outline-none transition-all"
                                    style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                >
                                    {campuses.map((c: CampusRecord) => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                    {campuses.length === 0 && <option value="Main">Main</option>}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Quantity</label>
                            <input
                                type="number"
                                value={form.quantity}
                                onChange={(e) => setForm(p => ({ ...p, quantity: parseInt(e.target.value) || 0 }))}
                                className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all"
                                style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label className="form-label">Unit</label>
                            <div className="relative">
                                <select
                                    value={form.unit_measure}
                                    onChange={(e) => setForm(p => ({ ...p, unit_measure: e.target.value }))}
                                    className="w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm font-medium outline-none transition-all"
                                    style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                >
                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="form-label">Expiry Date</label>
                            <input
                                type="date"
                                value={form.expiry_date || ''}
                                onChange={(e) => setForm(p => ({ ...p, expiry_date: e.target.value }))}
                                className={`w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all`}
                                style={{
                                    background: isExpired ? 'var(--danger-bg)' : 'var(--bg-wash)',
                                    border: `1px solid ${isExpired ? 'var(--danger)' : 'var(--border)'}`,
                                    color: isExpired ? 'var(--danger-text)' : 'var(--text-primary)'
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 flex gap-3" style={{ background: 'var(--bg-wash)', borderTop: '1px solid var(--border)' }}>
                    <button
                        onClick={() => onSave(form)}
                        disabled={!valid || isSubmitting}
                        className="btn-cta flex-1"
                    >
                        {isSubmitting ? 'Saving...' : item ? 'Update Asset' : 'Add Asset'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Stats Card ---
function StatCard({ label, value, icon: Icon, color, trend }: any) {
    return (
        <div className="bg-white rounded-[var(--radius-2xl)] p-5 shadow-[var(--shadow-sm)] border group" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    <h3 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{value}</h3>
                    {trend && (
                        <p className={`text-[9px] font-bold mt-2 flex items-center gap-1 ${trend.positive ? 'text-emerald-500' : 'text-red-500'}`}>
                            {trend.positive ? '↑' : '↓'} {trend.value} <span className="text-slate-400">vs last month</span>
                        </p>
                    )}
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3`} style={{ background: color.bg, color: color.icon }}>
                    <Icon size={24} strokeWidth={2.2} />
                </div>
            </div>
        </div>
    );
}

// ---- Main Inventory Page ----
export default function Inventory() {
    const { inventory, medicineRequests, campuses } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [statusFilter] = useState('All');
    const [campusFilter, setCampusFilter] = useState('All');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [isRequestsOpen, setIsRequestsOpen] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = viewMode === 'table' ? 10 : 6;

    // Medicine Requests Pagination
    const [requestPage, setRequestPage] = useState(1);
    const requestsPerPage = 4;

    // Modals & Confirmations
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<InventoryItem | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<InventoryItem | null>(null);
    const [confirmSave, setConfirmSave] = useState<Partial<InventoryItem> | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [viewMed, setViewMed] = useState<MedicineRequest | null>(null);
    const [rejectAction, setRejectAction] = useState<MedicineRequest | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ req: MedicineRequest; status: string } | null>(null);
    const [editMedRequest, setEditMedRequest] = useState<MedicineRequest | null>(null);
    const [confirmDeleteMed, setConfirmDeleteMed] = useState<MedicineRequest | null>(null);
    const [requestToConfirmDispense, setRequestToConfirmDispense] = useState<MedicineRequest | null>(null);
    const [successToast, setSuccessToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

    useEffect(() => {
        fetchInventoryFromDB();
        fetchMedicineRequestsFromDB();
    }, []);

    useEffect(() => {
        if (successToast.show) {
            const timer = setTimeout(() => setSuccessToast({ show: false, message: '' }), 3000);
            return () => clearTimeout(timer);
        }
    }, [successToast]);

    useEffect(() => {
        setCurrentPage(1);
        setRequestPage(1);
    }, [searchTerm, filterType, campusFilter, viewMode]);

    const filteredInventory = useMemo(() => {
        return inventory.filter(item => {
            const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'All' || item.asset_type === filterType;
            const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
            const matchesCampus = campusFilter === 'All' || item.campus === campusFilter;
            return matchesSearch && matchesType && matchesStatus && matchesCampus;
        });
    }, [inventory, searchTerm, filterType, statusFilter, campusFilter]);

    const paginatedInventory = filteredInventory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);

    const getAvailableQuantity = (itemName: string, quantity: number) => {
        const requested = medicineRequests
            .filter(r => r.medicine === itemName && (r.status === 'PENDING' || r.status === 'ACCEPTED'))
            .reduce((sum, r) => sum + r.medicine_qty, 0);
        return Math.max(0, quantity - requested);
    };

    const handleSaveItem = async () => {
        if (!confirmSave) return;
        setIsSubmitting(true);
        try {
            if (editItem) {
                await updateInventoryDB(editItem.id, confirmSave);
                addLog('Officer', `Updated inventory item: ${confirmSave.item_name}`);
            } else {
                await addInventoryDB(confirmSave as InventoryItem);
                addLog('Officer', `Added new inventory item: ${confirmSave.item_name}`);
            }
            setShowForm(false);
            setEditItem(null);
            setConfirmSave(null);
            setSuccessToast({ show: true, message: `Item ${editItem ? 'updated' : 'added'} successfully!` });
        } catch (e: any) {
            alert(e.message || 'Failed to save item.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteItem = async () => {
        if (!confirmDelete) return;
        setIsSubmitting(true);
        try {
            await deleteInventoryDB(confirmDelete.id);
            addLog('Officer', `Deleted inventory item: ${confirmDelete.item_name}`);
            setConfirmDelete(null);
            setSuccessToast({ show: true, message: 'Item deleted successfully!' });
        } catch (e: any) {
            alert(e.message || 'Failed to delete item.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequestAction = async (req: MedicineRequest, status: string, reason?: string) => {
        setIsSubmitting(true);
        try {
            await updateMedicineRequestStatusDB(req.id, status, req.medicine, req.medicine_qty, reason);

            let notifyMsg = `Your medicine request for ${req.medicine} has been ${status.toLowerCase()}.`;
            let notifType: NotificationType = `medicine_request_${status.toLowerCase()}` as NotificationType;

            if (status === 'ACCEPTED') {
                notifyMsg = req.generated_qr || req.id;
                notifType = 'medicine_dispense_qr';
            }

            await notifyIndividual(req.requester_id, 'Pharmacy Update', notifyMsg, notifType, req.id);
            addLog('Officer', `${status} request for ${req.medicine} from student: ${req.requester_id}`);

            setConfirmAction(null);
            setRejectAction(null);
            setViewMed(null);
            setSuccessToast({ show: true, message: `Request ${status.toLowerCase()} successfully!` });
        } catch (e: any) {
            alert(e.message || 'Action failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const data = results.data as any[];
                const validItems = data.filter(row => row.item_name && row.quantity);
                if (validItems.length === 0) return alert('No valid data found in CSV.');

                setIsSubmitting(true);
                try {
                    const itemsToInsert = validItems.map(row => ({
                        id: genId(),
                        item_name: row.item_name,
                        asset_type: row.asset_type || 'Medicine',
                        status: row.status || 'Available',
                        quantity: parseInt(row.quantity) || 0,
                        expiry_date: row.expiry_date || '',
                        unit_measure: row.unit_measure || 'By pieces',
                        campus: row.campus || (campuses.length > 0 ? campuses[0].name : 'Main')
                    }));

                    await bulkInsertInventoryDB(itemsToInsert);
                    addLog('Officer', `Bulk imported ${itemsToInsert.length} items to inventory.`);
                    setSuccessToast({ show: true, message: `Successfully imported ${itemsToInsert.length} items!` });
                } catch (err: any) {
                    alert('Import failed: ' + err.message);
                } finally {
                    setIsSubmitting(false);
                    e.target.value = '';
                }
            }
        });
    };

    const handleDeleteMedRequest = async () => {
        if (!confirmDeleteMed) return;
        setIsSubmitting(true);
        try {
            await deleteMedicineRequestDB(confirmDeleteMed.id);
            addLog('Officer', `Deleted medicine request for ${confirmDeleteMed.medicine}`);
            setConfirmDeleteMed(null);
            setSuccessToast({ show: true, message: 'Request deleted successfully' });
        } catch (e: any) {
            alert(e.message || 'Failed to delete request');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Inventory & Pharmacy</h1>
                    <p className="text-xs font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>Stock management and distribution lifecycle</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer transition-all hover:shadow-md active:scale-95" style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        <Upload size={15} />
                        Bulk CSV
                        <input type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
                    </label>
                    <button
                        onClick={() => setIsRequestsOpen(true)}
                        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95 ${isRequestsOpen ? 'hidden' : ''}`}
                        style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                    >
                        <History size={15} />
                        Requests
                        {medicineRequests.filter(r => r.status === 'PENDING').length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center border-2 border-white font-black animate-bounce">
                                {medicineRequests.filter(r => r.status === 'PENDING').length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => {
                            setEditItem(null);
                            setShowForm(true);
                        }}
                        className="btn-cta flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest"
                    >
                        <Plus size={16} strokeWidth={3} />
                        Add New Item
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard
                    label="Total Items"
                    value={inventory.length}
                    icon={Package}
                    color={{ bg: 'var(--accent-light)', icon: 'var(--accent)' }}
                />
                <StatCard
                    label="Low Stock"
                    value={inventory.filter(i => i.quantity > 0 && i.quantity <= 10).length}
                    icon={AlertCircle}
                    color={{ bg: 'var(--warning-bg)', icon: 'var(--warning)' }}
                />
                <StatCard
                    label="Pending Requests"
                    value={medicineRequests.filter(r => r.status === 'PENDING').length}
                    icon={Activity}
                    color={{ bg: 'var(--info-bg)', icon: 'var(--info)' }}
                />
                <StatCard
                    label="Total Dispensed"
                    value={medicineRequests.filter(r => r.status === 'DISPENSED').length}
                    icon={Check}
                    color={{ bg: 'var(--success-bg)', icon: 'var(--success)' }}
                />
            </div>

            {/* Main Layout Container */}
            <div className="flex flex-col lg:flex-row gap-6 relative items-start">

                {/* Left Column: Inventory List */}
                <div className="flex-1 min-w-0 space-y-6">
                    {/* Filters Bar */}
                    <div className="bg-white rounded-2xl p-4 shadow-[var(--shadow-sm)] border flex flex-wrap items-center justify-between gap-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
                        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
                            <div className="relative flex-1 max-w-md group">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--accent)] transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search catalog or location..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[13px] font-medium outline-none transition-all"
                                    style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative group">
                                    <select
                                        value={filterType}
                                        onChange={e => setFilterType(e.target.value)}
                                        className="pl-4 pr-10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer transition-all min-w-[140px]"
                                        style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                                    >
                                        <option value="All">All Types</option>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <ChevronDown size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                                </div>
                                <div className="relative group">
                                    <select
                                        value={campusFilter}
                                        onChange={e => setCampusFilter(e.target.value)}
                                        className="pl-4 pr-10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer transition-all min-w-[140px]"
                                        style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                                    >
                                        <option value="All">All Campuses</option>
                                        {campuses.map((c: CampusRecord) => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                    <ChevronDown size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 p-1 rounded-xl" style={{ background: 'var(--bg-wash)' }}>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-[var(--accent)]' : 'text-slate-400'}`}
                            >
                                <List size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[var(--accent)]' : 'text-slate-400'}`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>
                    </div>

                    {viewMode === 'table' ? (
                        <div className="bg-white rounded-2xl shadow-[var(--shadow-sm)] border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr style={{ background: 'var(--bg-wash)' }}>
                                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Asset Details</th>
                                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Campus</th>
                                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                                <div className="flex flex-col leading-tight">
                                                    <span>Quantity</span>
                                                    <span className="text-[8px] font-normal mt-1">On-hand / Available</span>
                                                </div>
                                            </th>
                                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Status</th>
                                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Expiry</th>
                                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-right" style={{ color: 'var(--text-muted)' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                                        {paginatedInventory.map(item => {
                                            const available = getAvailableQuantity(item.item_name, item.quantity);
                                            const isLow = available <= 10;
                                            const isOutOfStock = available === 0;

                                            return (
                                                <tr key={item.id} className="group hover:bg-[var(--bg-wash)] transition-colors">
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm border transition-transform group-hover:scale-105 ${isOutOfStock ? 'bg-red-50 text-red-600 border-red-100' :
                                                                    isLow ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                        'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                                }`}>
                                                                {item.asset_type === 'Medicine' ? <Pill size={18} /> : <Box size={18} />}
                                                            </div>
                                                            <div>
                                                                <p className="text-[13px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{item.item_name}</p>
                                                                <p className="text-[9px] font-bold tracking-widest uppercase mt-0.5" style={{ color: 'var(--text-faint)' }}>{item.asset_type}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>{item.campus}</span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex flex-col">
                                                            <span className={`font-bold ${isLow ? 'text-amber-600' : isOutOfStock ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>
                                                                {item.quantity} / {available}
                                                            </span>
                                                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{item.unit_measure}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${item.status === 'Available' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                item.status === 'Expired' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                    'bg-red-50 text-red-600 border-red-100'
                                                            }`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{item.expiry_date || 'N/A'}</span>
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    setEditItem(item);
                                                                    setShowForm(true);
                                                                }}
                                                                className="p-2 rounded-lg transition-all hover:bg-blue-50 hover:text-blue-600"
                                                                style={{ color: 'var(--text-muted)' }}
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmDelete(item)}
                                                                className="p-2 rounded-lg transition-all hover:bg-red-50 hover:text-red-600"
                                                                style={{ color: 'var(--text-muted)' }}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 border-t flex justify-end" style={{ borderColor: 'var(--border)' }}>
                                <PaginationControl
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {paginatedInventory.map(item => {
                                const available = getAvailableQuantity(item.item_name, item.quantity);
                                const isLow = available <= 10;
                                const isOutOfStock = available === 0;

                                return (
                                    <div key={item.id} className="rounded-2xl shadow-sm transition-all hover:shadow-xl group overflow-hidden border" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
                                        <div className="p-4 flex items-start justify-between border-b" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border)' }}>
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 border ${item.asset_type === 'Medicine' ? 'bg-blue-50 text-blue-600 border-blue-100/50' :
                                                    item.asset_type === 'Supplies' ? 'bg-amber-50 text-amber-600 border-amber-100/50' : 'bg-slate-50 text-slate-500 border-slate-100'
                                                }`}>
                                                {item.asset_type === 'Medicine' ? <Pill size={18} /> : <Box size={18} />}
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border mb-1.5 ${item.status === 'Available' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        item.status === 'Expired' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                            'bg-red-50 text-red-500 border-red-100'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                                <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{item.campus}</span>
                                            </div>
                                        </div>

                                        <div className="p-5">
                                            <div className="mb-4">
                                                <h3 className="font-bold text-[15px] group-hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text-primary)' }}>{item.item_name}</h3>
                                                <p className="text-[10px] font-bold mt-0.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{item.asset_type}</p>
                                            </div>

                                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 relative border border-slate-100">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold uppercase tracking-wider leading-none mb-1.5 text-slate-400">Stock / Avail</span>
                                                    <span className={`text-sm font-black ${isLow ? 'text-amber-600' : isOutOfStock ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>
                                                        {item.quantity} / {available}
                                                        <span className="text-[9px] uppercase font-bold ml-1 text-slate-400">{item.unit_measure.split(' ')[1] || item.unit_measure}</span>
                                                    </span>
                                                </div>
                                                <div className="absolute left-1/2 top-1/2 -translate-y-1/2 h-8 w-px bg-slate-200" />
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[9px] font-bold uppercase tracking-wider leading-none mb-1.5 text-slate-400">Expires</span>
                                                    <span className="text-[12px] font-bold" style={{ color: 'var(--text-secondary)' }}>{item.expiry_date || 'N/A'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mt-4 pt-4 border-t opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0" style={{ borderColor: 'var(--border-light)' }}>
                                                <button
                                                    onClick={() => {
                                                        setEditItem(item);
                                                        setShowForm(true);
                                                    }}
                                                    className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2"
                                                    style={{ color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid rgba(72,187,238,0.15)' }}
                                                >
                                                    <Edit size={12} /> Edit Asset
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete(item)}
                                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95 border border-red-100"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex justify-end mt-4">
                        <PaginationControl
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </div>

                {/* Right Side Slide-out Panel */}
                <div
                    className={`fixed lg:relative top-0 right-0 h-[calc(100vh-100px)] lg:h-[800px] z-40 flex transition-all duration-500 ease-in-out ${isRequestsOpen ? 'w-full lg:w-[450px]' : 'w-0 lg:w-[64px]'}`}
                >
                    {/* Collapsed Handle */}
                    {!isRequestsOpen && (
                        <button
                            onClick={() => setIsRequestsOpen(true)}
                            className="hidden lg:flex absolute inset-0 rounded-l-3xl flex-col items-center justify-start pt-4 shadow-2xl transition-all hover:bg-slate-50 group overflow-hidden z-50 focus:outline-none"
                            style={{ background: 'var(--card-bg)', borderLeft: '1px solid var(--border-light)' }}
                        >
                            <div className="flex flex-col items-center gap-2">
                                <ChevronDown size={20} className="-rotate-90 text-slate-400 group-hover:translate-x-1 transition-transform opacity-70" />
                                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center animate-pulse shadow-sm">
                                    <Pill size={20} />
                                </div>
                                <div className="rotate-90 whitespace-nowrap text-[9px] font-black uppercase tracking-[0.5em] text-slate-500 group-hover:text-blue-600 transition-colors mt-24">
                                    Medical Requests
                                </div>
                            </div>
                        </button>
                    )}

                    {/* Actual Panel Content */}
                    <div className={`w-full h-full flex flex-col overflow-hidden rounded-l-3xl shadow-2xl border-l transition-all duration-500 ease-in-out ${isRequestsOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-full opacity-0 invisible'}`} style={{ background: 'var(--card-bg)', borderColor: 'var(--border-light)' }}>
                        <div className="p-6 border-b flex items-center justify-between bg-slate-50/50" style={{ borderColor: 'var(--border-light)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                                    <Pill size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Student Requests</h4>
                                    <p className="text-[10px] font-bold text-slate-400">Queue for Dispatch</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                                    PENDING: {medicineRequests.filter(r => r.status?.toUpperCase() === 'PENDING').length}
                                </span>
                                <button
                                    onClick={() => setShowScanner(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95"
                                >
                                    <Camera size={12} /> Scan QR
                                </button>
                                <button
                                    onClick={() => setIsRequestsOpen(false)}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all text-slate-400"
                                >
                                    <ChevronDown size={20} className="-rotate-90" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {(() => {
                                const activeRequests = medicineRequests.filter(r => ['PENDING', 'ACCEPTED'].includes(r.status?.toUpperCase() || ''));
                                const totalRequestsPages = Math.ceil(activeRequests.length / requestsPerPage);
                                const paginatedRequests = activeRequests.slice((requestPage - 1) * requestsPerPage, requestPage * requestsPerPage);

                                if (activeRequests.length === 0) {
                                    return (
                                        <div className="py-20 text-center space-y-2">
                                            <Package size={32} className="mx-auto opacity-20" style={{ color: 'var(--text-faint)' }} />
                                            <p className="text-xs font-semibold italic" style={{ color: 'var(--text-faint)' }}>No pending requests</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-3">
                                        {paginatedRequests.map(req => (
                                            <div key={req.id} className="rounded-2xl p-4 space-y-3 transition-all" style={{ background: 'var(--bg-wash)', border: '1px solid var(--border-light)' }}>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm" style={{ background: 'var(--card-bg)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                                                            {req.medicine_qty}
                                                        </div>
                                                        <div>
                                                            <p className="text-[13px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{req.medicine}</p>
                                                            <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>{req.profiles?.fullName || req.profiles?.full_name || 'Loading...'}</p>
                                                        </div>
                                                    </div>
                                                    <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${req.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                        }`}>
                                                        {req.status}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border-light)' }}>
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                                        <Clock size={12} />
                                                        {new Date(req.requested_tst).toLocaleDateString()}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setViewMed(req)}
                                                            className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                                                            style={{ color: 'var(--text-muted)' }}
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        {req.status === 'PENDING' ? (
                                                            <button
                                                                onClick={() => setConfirmAction({ req, status: 'ACCEPTED' })}
                                                                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10"
                                                            >
                                                                Approve
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => setRequestToConfirmDispense(req)}
                                                                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/10"
                                                            >
                                                                Dispense
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {totalRequestsPages > 1 && (
                                            <div className="pt-2 flex justify-center">
                                                <PaginationControl
                                                    currentPage={requestPage}
                                                    totalPages={totalRequestsPages}
                                                    onPageChange={setRequestPage}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Notifications / Toasts */}
            {successToast.show && (
                <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-right-8 duration-300">
                    <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check size={18} strokeWidth={3} />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest">System Operation Success</p>
                            <p className="text-sm font-medium text-slate-300">{successToast.message}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showForm && (
                <InventoryFormModal
                    item={editItem}
                    onClose={() => { setShowForm(false); setEditItem(null); }}
                    onSave={(data) => setConfirmSave(data)}
                    isSubmitting={isSubmitting}
                />
            )}

            {confirmSave && (
                <ConfirmationDialog
                    isOpen={true}
                    title={editItem ? "Confirm Modification" : "Confirm Addition"}
                    description={`Are you sure you want to ${editItem ? 'update' : 'add'} "${confirmSave.item_name}"? This will reflect in real-time inventory tracking.`}
                    onConfirm={handleSaveItem}
                    onClose={() => setConfirmSave(null)}
                    isLoading={isSubmitting}
                    type="info"
                />
            )}

            {confirmDelete && (
                <ConfirmationDialog
                    isOpen={true}
                    title="Permanent Deletion"
                    description={`Warning: You are about to permanently delete "${confirmDelete.item_name}" from the inventory. This action is irreversible.`}
                    onConfirm={handleDeleteItem}
                    onClose={() => setConfirmDelete(null)}
                    isLoading={isSubmitting}
                    type="danger"
                />
            )}

            {confirmAction && (
                <ConfirmationDialog
                    isOpen={true}
                    title="Approve Request"
                    description={`Confirm approval for ${confirmAction.req.medicine} (${confirmAction.req.medicine_qty} units). This will notify the student for collection.`}
                    onConfirm={() => handleRequestAction(confirmAction.req, 'ACCEPTED')}
                    onClose={() => setConfirmAction(null)}
                    isLoading={isSubmitting}
                    type="info"
                />
            )}

            {requestToConfirmDispense && (
                <ConfirmationDialog
                    isOpen={true}
                    title="Confirm Dispensing"
                    description={`Are you sure you want to mark this request as DISPENSED? This will officially deduct ${requestToConfirmDispense.medicine_qty} units of ${requestToConfirmDispense.medicine} from your inventory.`}
                    onConfirm={() => handleRequestAction(requestToConfirmDispense, 'DISPENSED')}
                    onClose={() => setRequestToConfirmDispense(null)}
                    isLoading={isSubmitting}
                    type="success"
                />
            )}

            {viewMed && (
                <ViewMedicineRequestModal
                    req={viewMed}
                    onClose={() => setViewMed(null)}
                    onStatusChange={(status) => {
                        if (status === 'REJECTED') {
                            setRejectAction(viewMed);
                        } else {
                            handleRequestAction(viewMed, status);
                        }
                    }}
                    onEdit={(req) => setEditMedRequest(req)}
                    onDelete={(req) => setConfirmDeleteMed(req)}
                />
            )}

            {rejectAction && (
                <RejectReasonModal
                    request={rejectAction}
                    onClose={() => setRejectAction(null)}
                    onConfirm={(reason) => handleRequestAction(rejectAction, 'REJECTED', reason)}
                    isSubmitting={isSubmitting}
                    title="Reject Medicine Request"
                />
            )}

            {editMedRequest && (
                <NewMedRequestModal
                    onClose={() => setEditMedRequest(null)}
                    onSave={async (data) => {
                        await updateMedicineRequestDB(editMedRequest.id, data);
                        setEditMedRequest(null);
                        setSuccessToast({ show: true, message: 'Request updated successfully' });
                    }}
                    isSubmitting={isSubmitting}
                    initialData={editMedRequest}
                />
            )}

            {confirmDeleteMed && (
                <ConfirmationDialog
                    isOpen={true}
                    title="Delete Request"
                    description="Are you sure you want to delete this medicine request? This action cannot be undone."
                    onConfirm={handleDeleteMedRequest}
                    onClose={() => setConfirmDeleteMed(null)}
                    isLoading={isSubmitting}
                    type="danger"
                />
            )}

            {showScanner && (
                <QRScannerModal
                    onClose={() => setShowScanner(false)}
                    onScan={async (data) => {
                        const req = medicineRequests.find(r => r.generated_qr === data || r.id === data);
                        if (req) {
                            if (req.status === 'ACCEPTED') {
                                setRequestToConfirmDispense(req);
                                setShowScanner(false);
                            } else if (req.status === 'DISPENSED') {
                                alert('This medicine has already been dispensed.');
                            } else {
                                alert('This request is still pending approval.');
                            }
                        } else {
                            alert('Invalid QR code or request not found.');
                        }
                    }}
                />
            )}
        </div>
    );
}
