import { X, AlertTriangle, Info, CheckCircle, Trash2 } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  isLoading = false,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger': return <Trash2 style={{ color: 'var(--danger)' }} size={24} />;
      case 'warning': return <AlertTriangle style={{ color: 'var(--warning)' }} size={24} />;
      case 'success': return <CheckCircle style={{ color: 'var(--success)' }} size={24} />;
      default: return <Info style={{ color: 'var(--accent)' }} size={24} />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'danger': return 'var(--danger-bg)';
      case 'warning': return 'var(--warning-bg)';
      case 'success': return 'var(--success-bg)';
      default: return 'var(--accent-light)';
    }
  };

  const getButtonStyle = (): React.CSSProperties => {
    switch (type) {
      case 'danger': return { background: 'var(--danger)', boxShadow: '0 4px 12px rgba(226, 92, 92, 0.25)' };
      case 'warning': return { background: 'var(--warning)', boxShadow: '0 4px 12px rgba(229, 168, 50, 0.25)' };
      case 'success': return { background: 'var(--success)', boxShadow: '0 4px 12px rgba(46, 189, 133, 0.25)' };
      default: return { background: 'var(--accent)', boxShadow: '0 4px 12px rgba(72, 187, 238, 0.25)' };
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay" onClick={isLoading ? undefined : onClose}>
      <div
        className="relative rounded-2xl w-full max-w-md overflow-hidden scale-in"
        style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-xl)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div
              className="p-3 rounded-xl"
              style={{ background: getIconBg() }}
            >
              {getIcon()}
            </div>
            {!isLoading && (
              <button 
                onClick={onClose}
                className="p-2 rounded-xl transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-wash)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <X size={20} />
              </button>
            )}
          </div>
          
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <p className="leading-relaxed text-sm" style={{ color: 'var(--text-secondary)' }}>{description}</p>
        </div>
        
        <div className="p-6 flex gap-3" style={{ background: 'var(--bg-wash)' }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              color: 'var(--text-secondary)',
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            style={getButtonStyle()}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
