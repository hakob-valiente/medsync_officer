import { useState, useEffect, useMemo } from 'react';
import {
    Plus, Search, ChevronDown, Package, Pill, Box,
    Edit, Trash2, AlertCircle, Eye,
    FileText, FileSpreadsheet,
    LayoutGrid, List, Activity, Upload, Clock,
    X, Check
} from 'lucide-react';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
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
    updateMedicineRequestDB
} from '../store';
import { notifyIndividual, type NotificationType } from '../lib/notifications';
import { ViewMedicineRequestModal, RejectReasonModal, NewMedRequestModal } from './MedicalRequests';
import type { InventoryItem, MedicineRequest } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';


// ---- Inventory Form Modal ----
function InventoryFormModal({
    item,
    onClose,
    onSave,
    isSubmitting
}: {
    item?: InventoryItem | null;
    onClose: () => void;
    onSave: (data: any) => void;
    isSubmitting: boolean;
}) {
    const { campuses } = useStore();
    const [form, setForm] = useState({
        item_name: item?.item_name || '',
        asset_type: item?.asset_type || 'Medicine',
        status: item?.status || 'Available',
        quantity: item?.quantity || 0,
        expiry_date: item?.expiry_date || '',
        unit_measure: item?.unit_measure || 'By pieces',
        campus: item?.campus || (campuses.length > 0 ? campuses[0].name : 'Main')
    });

    const isExpired = form.expiry_date && new Date(form.expiry_date) <= new Date();
    const valid = form.item_name.trim() && form.quantity >= 0 && form.campus;

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
                            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Asset Management</p>
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
                                    <option value="Medicine">Medicine</option>
                                    <option value="Supplies">Supplies</option>
                                    <option value="Equipment">Equipment</option>
                                    <option value="Other">Other</option>
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
                                    {campuses.map(c => (
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
                                    <option value="By pieces">By pieces</option>
                                    <option value="By boxes">By boxes</option>
                                    <option value="By packs">By packs</option>
                                    <option value="By pairs">By pairs</option>
                                    <option value="In ml">In ml</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="form-label">Expiry Date</label>
                            <input
                                type="date"
                                value={form.expiry_date}
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


// ---- Main Inventory Page ----
export default function Inventory() {
    const { inventory, medicineRequests, campuses } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [statusFilter] = useState('All');
    const [campusFilter, setCampusFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('ALL');
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<InventoryItem | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = viewMode === 'table' ? 10 : 6;

    // Medicine Requests Pagination
    const [requestPage, setRequestPage] = useState(1);
    const requestsPerPage = 4;

    useEffect(() => {
        setCurrentPage(1);
        setRequestPage(1);
    }, [searchTerm, filterType, campusFilter, viewMode, dateFilter]);

    // Confirmations
    const [confirmSave, setConfirmSave] = useState<any | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<InventoryItem | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ req: MedicineRequest; status: string } | null>(null);
    const [viewMed, setViewMed] = useState<MedicineRequest | null>(null);
    const [rejectAction, setRejectAction] = useState<MedicineRequest | null>(null);
    const [editMedRequest, setEditMedRequest] = useState<MedicineRequest | null>(null);
    const [confirmDeleteMed, setConfirmDeleteMed] = useState<MedicineRequest | null>(null);
    const [successToast, setSuccessToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

    useEffect(() => {
        fetchInventoryFromDB();
        fetchMedicineRequestsFromDB();
    }, []);

    const filteredInventory = useMemo(() => {
        return inventory.filter(item => {
            const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'All' || item.asset_type === filterType;
            const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
            const matchesCampus = campusFilter === 'All' || item.campus === campusFilter;
            return matchesSearch && matchesType && matchesStatus && matchesCampus;
        });
    }, [inventory, searchTerm, filterType, statusFilter, campusFilter]);

    const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
    const paginatedInventory = filteredInventory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const pendingRequestsCount = medicineRequests.filter(r => r.status?.toUpperCase() === 'PENDING').length;

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
                addLog('Admin', `Updated inventory item: ${confirmSave.item_name}`);
            } else {
                await addInventoryDB(confirmSave);
                addLog('Admin', `Added new inventory item: ${confirmSave.item_name}`);
            }
            setShowForm(false);
            setEditItem(null);
            setConfirmSave(null);
            setSuccessToast({ show: true, message: `Item ${editItem ? 'updated' : 'added'} successfully!` });
            setTimeout(() => setSuccessToast({ show: false, message: '' }), 3000);
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
            addLog('Admin', `Deleted inventory item: ${confirmDelete.item_name}`);
            setConfirmDelete(null);
            setSuccessToast({ show: true, message: 'Item deleted successfully!' });
            setTimeout(() => setSuccessToast({ show: false, message: '' }), 3000);
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

            let notifyMsg = `The status of your medicine request for ${req.medicine} (${req.medicine_qty} units) has been moved to ${status}.`;
            if (status === 'ACCEPTED') {
                notifyMsg = `Your medicine request for ${req.medicine} has been approved. Please proceed to the clinic to receive your medicine.`;
            } else if (status === 'DISPENSED') {
                notifyMsg = `Your requested medicine ${req.medicine} has been dispensed successfully.`;
            } else if (status === 'REJECTED') {
                notifyMsg = `Your medicine request for ${req.medicine} was declined. Reason: ${reason || 'Not specified'}.`;
            }

            await notifyIndividual(
                req.requester_id,
                'Medicine Request Update',
                notifyMsg,
                `medicine_request_${status.toLowerCase()}` as NotificationType,
                req.id
            );

            addLog('Admin', `Updated medicine request status to ${status} for ${req.requester_name}`);
            setRejectAction(null);
            setViewMed(null);
            setConfirmAction(null);
        } catch (e: any) {
            alert(e.message || 'Action failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const data = results.data as any[];
                if (data.length === 0) return;

                // Simple validation check
                const first = data[0];
                if (!first.item_name || !first.quantity) {
                    alert('Invalid CSV format. Please ensure headers: item_name, quantity, asset_type, status, etc.');
                    return;
                }

                setIsSubmitting(true);
                try {
                    await bulkInsertInventoryDB(data);
                    alert(`Successfully imported ${data.length} items.`);
                } catch (e: any) {
                    alert('Import failed: ' + e.message);
                } finally {
                    setIsSubmitting(false);
                    e.target.value = '';
                }
            }
        });
    };

    const exportCSV = () => {
        if (filteredInventory.length === 0) return;
        const csv = Papa.unparse(filteredInventory);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `medsync_inventory_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportPDF = () => {
        if (filteredInventory.length === 0) return;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('PLV MedSync Inventory Report', 14, 20);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
        doc.text(`Campus Filter: ${campusFilter}`, 14, 34);

        const tableData = filteredInventory.map(item => [
            item.item_name,
            item.asset_type,
            item.campus || 'Main',
            item.quantity.toString(),
            item.unit_measure,
            item.expiry_date || 'N/A',
            item.status
        ]);

        autoTable(doc, {
            head: [['Item Name', 'Type', 'Campus', 'Qty', 'Unit', 'Expiry', 'Status']],
            body: tableData,
            startY: 40,
            theme: 'striped',
            headStyles: { fillColor: [100, 100, 100] },
            styles: { fontSize: 8 }
        });

        doc.save(`medsync_inventory_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Inventory Management</h2>
                    <p className="text-sm mt-1 font-medium opacity-70" style={{ color: 'var(--text-secondary)' }}>Tracking medicines, medical supplies, and equipment levels.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <input
                            type="file"
                            id="csvImport"
                            accept=".csv"
                            className="hidden"
                            onChange={importCSV}
                        />
                        <label
                            htmlFor="csvImport"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all active:scale-95 border border-slate-200 hover:text-green-600 hover:bg-green-50 hover:border-green-200"
                        >
                            <Upload size={16} /> Import CSV
                        </label>
                    </div>
                    <button
                        onClick={() => {
                            setEditItem(null);
                            setShowForm(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
                        style={{ color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid rgba(72,187,238,0.15)' }}
                    >
                        <Plus size={16} /> Add New Item
                    </button>
                </div>
            </div>

            {/* Quick Actions & Stats */}
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {[
                    { label: 'Total Assets', val: inventory.length, color: 'var(--accent)', icon: Package, sub: 'In stock' },
                    { label: 'Low Stock Alerts', val: inventory.filter(i => i.quantity < 20).length, color: 'var(--warning)', icon: AlertCircle, sub: 'Needs attention' },
                    { label: 'Expired Items', val: inventory.filter(i => i.status === 'Expired').length, color: 'var(--danger)', icon: Clock, sub: 'Remove immediately' },
                    { label: 'Pending Requests', val: pendingRequestsCount, color: 'var(--teal-primary)', icon: Activity, sub: 'Medicine requests' },
                ].map((stat, i) => (
                    <div key={i} className="kpi-card fade-in overflow-hidden relative" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', padding: '1.25rem', borderRadius: '1rem' }}>
                        <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: stat.color, opacity: 0.7 }} />
                        <div className="flex items-start justify-between relative z-10">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>{stat.label}</p>
                                <p className="text-3xl font-bold tracking-tight mt-1.5" style={{ color: 'var(--text-primary)' }}>{stat.val}</p>
                                <p className="text-[10px] font-medium mt-1 opacity-60" style={{ color: 'var(--text-secondary)' }}>{stat.sub}</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${stat.color}14` }}>
                                <stat.icon size={20} style={{ color: stat.color }} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full" style={{ background: stat.color, opacity: 0.03 }} />
                    </div>
                ))}
            </div>

            {/* Controls Bar */}
            <div className="rounded-2xl p-4 flex flex-wrap items-center gap-4 shadow-sm" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                <div className="relative flex-1 min-w-[280px] max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search assets by name..."
                        className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl outline-none font-normal transition-colors"
                        style={{
                            background: 'var(--bg-wash)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)'
                        }}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <select
                            value={campusFilter}
                            onChange={(e) => setCampusFilter(e.target.value)}
                            className="appearance-none rounded-xl px-5 py-2.5 pr-10 text-xs font-semibold outline-none transition-colors"
                            style={{
                                background: 'var(--bg-wash)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <option value="All">All Campuses</option>
                            {campuses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            {campuses.length === 0 && <option value="Main">Main</option>}
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
                    </div>
                    <div className="relative">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="appearance-none rounded-xl px-5 py-2.5 pr-10 text-xs font-semibold outline-none transition-colors shadow-sm"
                            style={{
                                background: 'var(--bg-wash)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <option value="All">All Categories</option>
                            <option value="Medicine">Medicine Only</option>
                            <option value="Supplies">Supplies Only</option>
                            <option value="Equipment">Equipment Only</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
                    </div>

                    <div className="relative">
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="appearance-none rounded-xl px-5 py-2.5 pr-10 text-xs font-semibold outline-none transition-colors shadow-sm"
                            style={{
                                background: 'var(--bg-wash)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <option value="ALL">All Inventory</option>
                            <option value="EXPIRING">Expiring (30d)</option>
                            <option value="LOW">Low Stock</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
                    </div>

                    <div className="flex items-center p-1.5 rounded-2xl shadow-sm" style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)' }}>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'table' ? 'shadow-sm' : 'opacity-40 hover:opacity-100'}`}
                            style={viewMode === 'table' ? { background: 'var(--card-bg)', color: 'var(--accent)', border: '1px solid var(--border)' } : { color: 'var(--text-muted)' }}
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'shadow-sm' : 'opacity-40 hover:opacity-100'}`}
                            style={viewMode === 'grid' ? { background: 'var(--card-bg)', color: 'var(--accent)', border: '1px solid var(--border)' } : { color: 'var(--text-muted)' }}
                        >
                            <LayoutGrid size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 border-l pl-3 ml-1" style={{ borderColor: 'var(--border)' }}>
                        <button
                            onClick={exportCSV}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm border"
                            style={{
                                background: 'var(--card-bg)',
                                color: 'var(--success)',
                                borderColor: 'rgba(52,211,153,0.15)'
                            }}
                            onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-wash)'; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'var(--card-bg)'; }}
                        >
                            <FileSpreadsheet size={15} /> Export CSV
                        </button>
                        <button
                            onClick={exportPDF}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm border"
                            style={{
                                background: 'var(--card-bg)',
                                color: 'var(--danger)',
                                borderColor: 'rgba(239,68,68,0.15)'
                            }}
                            onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-wash)'; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'var(--card-bg)'; }}
                        >
                            <FileText size={15} /> Export PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Dashboard Content Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Column: Inventory List */}
                <div className="lg:col-span-8 space-y-6">
                    {viewMode === 'table' ? (
                        <div className="rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full zebra-table">
                                    <thead>
                                        <tr style={{ background: 'var(--bg-wash)', borderBottom: '1px solid var(--border)' }}>
                                            {['Item Name', 'Campus', 'Quantity\nOn-hand / Available', 'Status', 'Expiry', 'Actions'].map(h => (
                                                <th key={h} className="text-left text-[10px] font-medium uppercase tracking-wider px-6 py-4" style={{ color: 'var(--text-muted)' }}>
                                                    {h.includes('\n') ? (
                                                        <div className="flex flex-col leading-tight">
                                                            <span>{h.split('\n')[0]}</span>
                                                            <span className="text-[8px] font-normal mt-1" style={{ color: 'var(--text-muted)' }}>
                                                                {h.split('\n')[1]}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        h
                                                    )}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedInventory.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3 text-slate-300">
                                                        <Package size={48} className="opacity-20" />
                                                        <p className="text-sm font-bold italic">No matching assets found</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedInventory.map(item => (
                                                <tr key={item.id} className="transition-colors group text-sm" style={{ borderBottom: '1px solid var(--border-light)' }}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                                                                style={{
                                                                    background: item.asset_type === 'Medicine' ? 'var(--accent-light)' :
                                                                        item.asset_type === 'Supplies' ? 'var(--warning-bg)' : 'var(--bg-wash)',
                                                                    color: item.asset_type === 'Medicine' ? 'var(--accent)' :
                                                                        item.asset_type === 'Supplies' ? 'var(--warning)' : 'var(--text-muted)'
                                                                }}>
                                                                {item.asset_type === 'Medicine' ? <Pill size={14} strokeWidth={2.5} /> : <Package size={14} strokeWidth={2.5} />}
                                                            </div>
                                                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.item_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{item.campus || 'Main'}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className={`font-medium ${item.quantity < 20 ? 'text-red-500' : ''}`} style={{ color: item.quantity >= 20 ? 'var(--text-primary)' : undefined }}>
                                                                {item.quantity} / {getAvailableQuantity(item.item_name, item.quantity)}
                                                            </span>
                                                            <span className="text-[9px] font-medium uppercase tracking-wider opacity-60" style={{ color: 'var(--text-muted)' }}>{item.unit_measure}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[9px] font-medium uppercase tracking-widest px-2.5 py-1 rounded-full border ${item.status === 'Available' ? 'bg-green-50 text-green-600 border-green-100' :
                                                            item.status === 'Expired' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-red-50 text-red-500 border-red-100'
                                                            }`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{item.expiry_date || 'N/A'}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditItem(item);
                                                                    setShowForm(true);
                                                                }}
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                                                                style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmDelete(item)}
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95"
                                                                style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
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
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {paginatedInventory.map(item => (
                                    <div key={item.id} className="rounded-3xl shadow-sm transition-all hover:shadow-xl hover:shadow-slate-100 group overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                                        <div className="p-4 flex items-start justify-between border-b" style={{ background: 'var(--bg-wash)', borderColor: 'var(--border)' }}>
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 border ${item.asset_type === 'Medicine' ? 'bg-blue-50 text-blue-600 border-blue-100/50' :
                                                item.asset_type === 'Supplies' ? 'bg-amber-50 text-amber-600 border-amber-100/50' : 'bg-slate-50 text-slate-500 border-slate-100'
                                                }`}>
                                                {item.asset_type === 'Medicine' ? <Pill size={18} /> :
                                                    item.asset_type === 'Supplies' ? <Package size={18} /> : <Box size={18} />}
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className={`text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border mb-1.5 ${item.status === 'Available' ? 'bg-green-50 text-green-600 border-green-100' : item.status === 'Expired' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-red-50 text-red-500 border-red-100'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{item.campus || 'Main'}</span>
                                            </div>
                                        </div>

                                        <div className="p-5">
                                            <div className="mb-4">
                                                <h3 className="font-semibold text-base group-hover:text-blue-600 transition-colors" style={{ color: 'var(--text-primary)' }}>{item.item_name}</h3>
                                                <p className="text-[10px] font-medium mt-0.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{item.asset_type}</p>
                                            </div>

                                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 relative">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-medium uppercase tracking-wider leading-none mb-1.5" style={{ color: 'var(--text-muted)' }}>Stock / Avail</span>
                                                    <span className={`text-sm font-semibold ${item.quantity < 20 ? 'text-red-500' : ''}`} style={{ color: item.quantity >= 20 ? 'var(--text-primary)' : undefined }}>
                                                        {item.quantity} / {getAvailableQuantity(item.item_name, item.quantity)}
                                                        <span className="text-[9px] uppercase font-bold ml-1" style={{ color: 'var(--text-muted)' }}>{item.unit_measure.split(' ')[1] || item.unit_measure}</span>
                                                    </span>
                                                </div>
                                                <div className="absolute left-1/2 top-1/2 -translate-y-1/2 h-8 w-px bg-slate-200" />
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[9px] font-medium uppercase tracking-wider leading-none mb-1.5" style={{ color: 'var(--text-muted)' }}>Expires</span>
                                                    <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{item.expiry_date || 'N/A'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mt-4 pt-4 border-t opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0" style={{ borderColor: 'var(--border-light)' }}>
                                                <button
                                                    onClick={() => {
                                                        setEditItem(item);
                                                        setShowForm(true);
                                                    }}
                                                    className="flex-1 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2"
                                                    style={{ color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid rgba(72,187,238,0.15)' }}
                                                >
                                                    <Edit size={12} /> Edit Asset
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete(item)}
                                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95"
                                                    title="Remove Asset"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Standardized Pagination UI for Grid */}
                            <div className="flex items-center justify-between p-4 rounded-3xl mt-4 shadow-sm" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
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
                    )}
                </div>

                {/* Right Column: Medicine Requests Table */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="rounded-3xl shadow-sm overflow-hidden flex flex-col h-full max-h-[800px]" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                                    <Clock size={16} />
                                </div>
                                <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Medicine Requests</h3>
                            </div>
                            <span className="text-[10px] font-medium px-2 py-1 rounded-lg" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                                {medicineRequests.filter(r => r.status?.toUpperCase() === 'PENDING').length} PENDING
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                                    <>
                                        <div className="space-y-3 flex-1">
                                            {paginatedRequests.map(req => (
                                                <div key={req.id} className="rounded-2xl p-4 space-y-3 transition-all" style={{ background: 'var(--bg-wash)', border: '1px solid var(--border-light)' }}>
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm" style={{ background: 'var(--card-bg)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                                                                {req.medicine_qty}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-semibold text-xs leading-tight" style={{ color: 'var(--text-primary)' }}>{req.medicine}</h4>
                                                                    {req.admin_created && (
                                                                        <span className="px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider bg-amber-100 text-amber-600 border border-amber-200 shrink-0">Admin Created</span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{req.requester_name}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-2.5 rounded-xl text-[10px] italic leading-snug" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                                                        "{req.request_reason || 'No reason'}"
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {req.status?.toUpperCase() === 'PENDING' ? (
                                                            <button
                                                                onClick={() => setConfirmAction({ req, status: 'ACCEPTED' })}
                                                                disabled={isSubmitting}
                                                                className="flex-1 py-1 px-2 rounded-xl text-[9px] font-semibold uppercase tracking-wider transition-all disabled:opacity-40 hover:bg-emerald-600 hover:text-white border flex items-center justify-center gap-1.5"
                                                                style={{ borderColor: 'var(--border)' }}
                                                            >
                                                                <Check size={12} /> Accept
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => setConfirmAction({ req, status: 'DISPENSED' })}
                                                                disabled={isSubmitting}
                                                                className="flex-1 py-1 px-2 rounded-xl text-[9px] font-semibold uppercase tracking-wider transition-all disabled:opacity-40 hover:bg-blue-600 hover:text-white border flex items-center justify-center gap-1.5"
                                                                style={{ borderColor: 'var(--border)' }}
                                                            >
                                                                Dispense
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setViewMed(req)}
                                                            className="px-2 py-1 rounded-xl transition-all active:scale-95 flex items-center justify-center hover:bg-slate-100 border"
                                                            style={{ borderColor: 'var(--border)' }}
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setRejectAction(req)}
                                                            disabled={isSubmitting}
                                                            className="flex-[0.5] py-2 rounded-xl transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center border hover:bg-red-500 hover:text-white"
                                                            style={{ color: 'var(--danger)', borderColor: 'var(--border)' }}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Pagination for requests */}
                                        <div className="pt-4 mt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                                            <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                                Page {requestPage} of {Math.max(1, totalRequestsPages)}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => setRequestPage(p => Math.max(1, p - 1))}
                                                    disabled={requestPage === 1}
                                                    className="p-1 px-2 rounded-lg text-[9px] font-medium uppercase border disabled:opacity-40 transition-colors"
                                                    style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                                                >
                                                    Prev
                                                </button>
                                                <button
                                                    onClick={() => setRequestPage(p => Math.min(totalRequestsPages, p + 1))}
                                                    disabled={requestPage === totalRequestsPages || totalRequestsPages === 0}
                                                    className="p-1 px-2 rounded-lg text-[9px] font-medium uppercase border disabled:opacity-40 transition-colors"
                                                    style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showForm && (
                <InventoryFormModal
                    item={editItem}
                    onClose={() => {
                        setShowForm(false);
                        setEditItem(null);
                    }}
                    onSave={(data) => setConfirmSave(data)}
                    isSubmitting={isSubmitting}
                />
            )}

            {viewMed && (
                <ViewMedicineRequestModal
                    request={viewMed}
                    onClose={() => setViewMed(null)}
                    onEdit={() => {
                        setEditMedRequest(viewMed);
                        setViewMed(null);
                    }}
                    onDelete={() => {
                        setConfirmDeleteMed(viewMed);
                        setViewMed(null);
                    }}
                    onStatusChange={(status) => {
                        if (status === 'REJECTED') {
                            setRejectAction(viewMed);
                            setViewMed(null);
                        } else {
                            handleRequestAction(viewMed, status);
                        }
                    }}
                    isSubmitting={isSubmitting}
                />
            )}

            {rejectAction && (
                <RejectReasonModal
                    request={rejectAction}
                    onClose={() => setRejectAction(null)}
                    onConfirm={(reason) => handleRequestAction(rejectAction, 'REJECTED', reason)}
                    isSubmitting={isSubmitting}
                />
            )}

            {/* Delete Confirmation */}
            <ConfirmationDialog
                isOpen={!!confirmDelete}
                title="Remove Asset"
                description={`Are you sure you want to permanently delete ${confirmDelete?.item_name} from the inventory? This cannot be undone.`}
                confirmText="Permanently Delete"
                type="danger"
                isLoading={isSubmitting}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDeleteItem}
            />

            {/* Save Confirmation */}
            <ConfirmationDialog
                isOpen={!!confirmSave}
                title={editItem ? "Update Asset" : "Register New Asset"}
                description={`Confirm ${editItem ? 'changes to' : 'addition of'} ${confirmSave?.item_name}? This will update official clinical records.`}
                confirmText={editItem ? "Update Records" : "Confirm Entry"}
                type="info"
                isLoading={isSubmitting}
                onClose={() => setConfirmSave(null)}
                onConfirm={handleSaveItem}
            />

            <ConfirmationDialog
                isOpen={!!confirmAction}
                title="Confirm Action"
                description={`Are you sure you want to ${confirmAction?.status === 'ACCEPTED' ? 'accept' : 'dispense'} this request?`}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => confirmAction && handleRequestAction(confirmAction.req, confirmAction.status)}
                isLoading={isSubmitting}
                type="info"
            />

            {/* Delete Medicine Request Confirmation */}
            <ConfirmationDialog
                isOpen={!!confirmDeleteMed}
                title="Delete Medicine Request"
                description="Are you sure you want to permanently delete this admin-created medicine request? This cannot be undone."
                confirmText="Permanently Delete"
                type="danger"
                isLoading={isSubmitting}
                onClose={() => setConfirmDeleteMed(null)}
                onConfirm={async () => {
                    if (!confirmDeleteMed) return;
                    setIsSubmitting(true);
                    try {
                        await deleteMedicineRequestDB(confirmDeleteMed.id);
                        addLog('Admin', `Deleted medicine request ${confirmDeleteMed.id}`);
                        setConfirmDeleteMed(null);
                    } catch (e: any) {
                        alert(e.message || 'Deletion failed.');
                    } finally {
                        setIsSubmitting(false);
                    }
                }}
            />

            {/* Edit Medicine Request Modal */}
            {editMedRequest && (
                <NewMedRequestModal
                    initialData={editMedRequest}
                    onClose={() => setEditMedRequest(null)}
                    isSubmitting={isSubmitting}
                    onSave={async (data) => {
                        setIsSubmitting(true);
                        try {
                            await updateMedicineRequestDB(editMedRequest.id, data);
                            addLog('Admin', `Updated medicine request ${editMedRequest.id}`);
                            setEditMedRequest(null);
                        } catch (e: any) {
                            alert(e.message || 'Failed to update request.');
                        } finally {
                            setIsSubmitting(false);
                        }
                    }}
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
